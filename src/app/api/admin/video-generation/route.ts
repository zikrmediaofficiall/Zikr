import { NextRequest, NextResponse } from 'next/server';
import { canViewVideoRequestContent, isKidsVideoContentMarker, normalizeVideoAudience } from "@/features/videos/services/video-audience-visibility";
import { requireAdminApi } from '@/features/admin/services/admin';
import { requireAdminStepUpApi } from '@/features/admin/services/security';
import { recordAdminAuditEvent } from '@/features/admin/services/audit';
import { runPostCommitAudit } from '@/features/admin/services/post-commit-audit';
import { supabaseServerAdminRequest } from '@/lib/supabase/server';
import { readBoundedJsonBody } from '@/lib/request/bounded-json-body';
import { buildVideoApprovalSnapshotHash, buildVideoCatalogApprovalPatch, hasCompleteKidsVideoSeriesMetadata, hasCompleteVideoApprovalChecklist, resolveKidsVideoQaStatusForApproval, REQUIRED_VIDEO_APPROVAL_CHECKS } from '@/features/videos/services/video-publish-approval';

export const dynamic = 'force-dynamic';

const VIDEO_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const auth = await requireAdminApi('video.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const rows = await supabaseServerAdminRequest<Array<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      status: string;
      youtube_id: string | null;
      facebook_id: string | null;
      video_url: string | null;
      heygen_video_id: string | null;
      heygen_status: string | null;
      error_message: string | null;
      error_details: string | null;
      created_at: string;
      updated_at: string;
      content: unknown;
    }>>('/rest/v1/video_generation_requests?order=created_at.desc&limit=500');

    const kidsAuth = await requireAdminApi("kids.manage");
    const canManageKids = kidsAuth.ok && kidsAuth.profile.id === auth.profile.id;
    const items = (rows ?? []).filter((row) => canViewVideoRequestContent(row, canManageKids));
    const counts = { total: items.length, pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of items) {
      if (row.status in counts) counts[row.status as keyof typeof counts] += 1;
    }
    return NextResponse.json({ items, counts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/admin/video-generation] GET:', error);
    return NextResponse.json({ error: 'تعذر تحميل عمليات توليد الفيديو.' }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAdminStepUpApi('video.delete', '/admin/video/requests');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.error, nextPath: "nextPath" in auth ? auth.nextPath : undefined },
      { status: auth.status },
    );
  }

  return NextResponse.json(
    {
      error: 'حذف سجلات طلبات التوليد معطل حتى اكتمال مراجعة مراجع الوسائط والطابور.',
      code: 'VIDEO_GENERATION_DELETE_REQUIRES_REFERENCE_AUDIT',
      deletionStarted: false,
      recordsDeleted: 0,
      message: 'No rows were changed.',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminStepUpApi('video.manage', '/admin/video/requests');
  if (!auth.ok) return NextResponse.json({ error: auth.error, nextPath: 'nextPath' in auth ? auth.nextPath : undefined }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });

  try {
    const parsedBody = await readBoundedJsonBody(request, 16 * 1024);
    if (!parsedBody.ok) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!parsedBody.value || typeof parsedBody.value !== 'object' || Array.isArray(parsedBody.value)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const body = parsedBody.value as {
      id?: unknown;
      errorMessage?: unknown;
      action?: unknown;
      qaChecklist?: unknown;
    };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!VIDEO_REQUEST_ID_PATTERN.test(id)) return NextResponse.json({ error: 'معرّف العملية غير صالح.' }, { status: 400 });

    // Publish retry preserves the generated provider job and any successful
    // platform IDs so only missing publication work is attempted again.
    if (action === 'approve_publish') {
      if (!hasCompleteVideoApprovalChecklist(body.qaChecklist)) {
        return NextResponse.json({ error: 'لا يمكن الاعتماد قبل إتمام فحوص المصدر والصوت والصورة والترجمة والحقوق.' }, { status: 400 });
      }
      const rows = await supabaseServerAdminRequest<Array<{
        id: string; status: string; category: string; video_url: string | null; source_hash: string | null; content_hash: string | null; template_version: string | null; content: unknown; updated_at: string;
      }>>('/rest/v1/video_generation_requests?id=eq.' + encodeURIComponent(id) + '&select=id,status,category,video_url,source_hash,content_hash,template_version,content,updated_at&limit=1');
      const current = rows?.[0];
      if (!current) return NextResponse.json({ error: 'عملية الفيديو غير موجودة.' }, { status: 404 });
      if (current.status !== 'completed' || !current.video_url) {
        return NextResponse.json({ error: 'يجب أن يكتمل توليد ملف الفيديو قبل اعتماده للنشر.' }, { status: 409 });
      }
      if (!current.updated_at || !Number.isFinite(Date.parse(current.updated_at))) {
        return NextResponse.json({ error: 'تاريخ تحديث طلب الفيديو غير صالح؛ حدّث التفاصيل ثم أعد المحاولة.' }, { status: 409 });
      }
      const currentContent = current.content && typeof current.content === 'object' && !Array.isArray(current.content)
        ? current.content as Record<string, unknown> : {};
      const audience = normalizeVideoAudience(currentContent.audience);
      if (!audience) {
        return NextResponse.json({ error: 'فئة الجمهور غير معروفة؛ تم إيقاف الاعتماد.' }, { status: 409 });
      }
      const hasKidsIntent = isKidsVideoContentMarker(currentContent);
      if (hasKidsIntent && audience !== 'kids') {
        return NextResponse.json(
          { error: 'علامات محتوى الأطفال لا تتوافق مع فئة الجمهور المسجلة؛ حدّث بيانات الجمهور قبل الاعتماد.' },
          { status: 409, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const isKidsVideo = audience === 'kids';
      // Video managers may review general-audience assets, but Kids publication
      // approval also changes the public child-directed content surface.
      // Require the separate Kids permission before reading or mutating the catalog.
      if (isKidsVideo) {
        const kidsAuth = await requireAdminApi('kids.manage');
        if (!kidsAuth.ok) {
          return NextResponse.json(
            { error: kidsAuth.error },
            { status: kidsAuth.status, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        if (kidsAuth.profile.id !== auth.profile.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
          );
        }
      }
      const catalogSlug = "zikr-" + id.toLowerCase().replace(/[^a-z0-9-]/g, "");
      const catalogRows = await supabaseServerAdminRequest<Array<{
        id: string; metadata: Record<string, unknown> | null; updated_at: string | null;
      }>>(
        '/rest/v1/videos?slug=eq.' + encodeURIComponent(catalogSlug) + '&select=id,metadata,updated_at&limit=2',
      );
      const catalog = catalogRows?.length === 1 ? catalogRows[0] : null;
      if (!catalog?.id || !catalog.updated_at || !Number.isFinite(Date.parse(catalog.updated_at))) {
        return NextResponse.json({ error: 'سجل الفيديو الداخلي غير جاهز للاعتماد؛ لم يتم تغيير حالة العملية.' }, { status: 409 });
      }
      const automatedQa = currentContent.automatedVideoQa && typeof currentContent.automatedVideoQa === 'object' && !Array.isArray(currentContent.automatedVideoQa)
        ? currentContent.automatedVideoQa as Record<string, unknown>
        : {};
      const verifiedKidsVideoQaStatus = isKidsVideo ? resolveKidsVideoQaStatusForApproval({
        requestContent: currentContent,
        catalogMetadata: catalog.metadata,
        requestId: id,
        videoUrl: current.video_url,
        sourceHash: current.source_hash,
        contentHash: current.content_hash,
        templateVersion: current.template_version,
      }) : null;
      if (isKidsVideo && (
        verifiedKidsVideoQaStatus !== 'passed' ||
        automatedQa.status !== 'passed' ||
        !hasCompleteKidsVideoSeriesMetadata(currentContent)
      )) {
        return NextResponse.json({ error: 'فحص أمان فيديو الأطفال أو بيانات السلسلة غير مكتملة؛ لا يمكن اعتماد النشر.' }, { status: 409 });
      }
      const reviewContent = isKidsVideo
        ? { ...currentContent, kidsVideoQaStatus: verifiedKidsVideoQaStatus }
        : currentContent;
      if (new Set(['quran', 'hadith', 'story', 'dua', 'adhkar']).has(current.category)) {
        const sourceUrl = typeof currentContent.sourceUrl === 'string' ? currentContent.sourceUrl : '';
        const sourceLabel = typeof currentContent.sourceLabel === 'string' ? currentContent.sourceLabel.trim() : '';
        const sourceText = typeof currentContent.textAr === 'string' ? currentContent.textAr.trim()
          : typeof currentContent.text === 'string' ? currentContent.text.trim() : '';
        let validSourceUrl = false;
        try { validSourceUrl = new URL(sourceUrl).protocol === 'https:'; } catch { validSourceUrl = false; }
        if (!validSourceUrl || !sourceLabel || !sourceText) {
          return NextResponse.json({ error: 'المصدر أو نصه أو مرجعه غير مكتمل؛ لا يمكن اعتماد فيديو ديني بلا مصدر موثق.' }, { status: 422 });
        }
      }
      const approvalSnapshotHash = buildVideoApprovalSnapshotHash({
        category: current.category,
        sourceHash: current.source_hash,
        contentHash: current.content_hash,
        templateVersion: current.template_version,
        videoUrl: current.video_url,
        audience,
        kidsVideoQaStatus: isKidsVideo ? String(reviewContent.kidsVideoQaStatus) : null,
      });
      if (!approvalSnapshotHash) {
        return NextResponse.json({ error: 'بصمة المصدر أو المحتوى أو ملف الفيديو غير مكتملة؛ أعد تجهيز الفيديو قبل اعتماده.' }, { status: 422 });
      }

      const approvalReviewContent = { ...reviewContent, approvalSnapshotHash };
      const reviewedAt = new Date().toISOString();
      const qualityReview = {
        ...Object.fromEntries(REQUIRED_VIDEO_APPROVAL_CHECKS.map((key) => [key, true])),
        reviewedAt,
        mode: 'human',
        reviewerId: auth.profile.id,
      };
      const catalogPatch = buildVideoCatalogApprovalPatch({
        metadata: catalog.metadata,
        requestContent: approvalReviewContent,
        requestId: id,
        videoUrl: current.video_url,
        sourceHash: current.source_hash,
        contentHash: current.content_hash,
        templateVersion: current.template_version,
        snapshotHash: approvalSnapshotHash,
        reviewerId: auth.profile.id,
        reviewedAt,
        checks: body.qaChecklist,
      });
      if (!catalogPatch) {
        return NextResponse.json({ error: 'بيانات الفيديو في المكتبة لا تطابق نسخة المصدر التي تمت مراجعتها؛ لم يتم اعتمادها.' }, { status: 409 });
      }

      const updatedContent = {
        ...approvalReviewContent,
        approvalStatus: 'approved',
        approvalReviewerId: auth.profile.id,
        approvalReviewedAt: reviewedAt,
        approvalSnapshotHash,
        qualityReview,
      };
      let approvalRows: Array<{ request_id: string; catalog_video_id: string; updated_at: string }> | null = null;
      try {
        approvalRows = await supabaseServerAdminRequest<Array<{
          request_id: string;
          catalog_video_id: string;
          updated_at: string;
        }>>(
          '/rest/v1/rpc/admin_approve_video_generation_request',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({
              p_request_id: id,
              p_expected_request_updated_at: current.updated_at,
              p_catalog_video_id: catalog.id,
              p_catalog_slug: catalogSlug,
              p_expected_catalog_updated_at: catalog.updated_at,
              p_reviewed_at: reviewedAt,
              p_approved_content: updatedContent,
              p_catalog_metadata: catalogPatch.metadata,
            }),
          },
        );
      } catch (approvalError) {
        const message = approvalError instanceof Error ? approvalError.message : String(approvalError);
        if (message.includes('VIDEO_APPROVAL_CONFLICT')) {
          return NextResponse.json(
            { error: 'تغير سجل طلب الفيديو أو المكتبة أثناء المراجعة؛ حدّث التفاصيل ثم أعد الفحص.' },
            { status: 409, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        throw approvalError;
      }
      if (
        approvalRows?.length !== 1 ||
        approvalRows[0]?.request_id !== id ||
        approvalRows[0]?.catalog_video_id !== catalog.id ||
        !Number.isFinite(Date.parse(approvalRows[0]?.updated_at ?? '')) ||
        Date.parse(approvalRows[0].updated_at) !== Date.parse(reviewedAt)
      ) {
        return NextResponse.json(
          { error: 'تعذر تأكيد اعتماد طلب الفيديو وسجل المكتبة معًا؛ حدّث الصفحة وأعد المحاولة.' },
          { status: 409, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const auditRecorded = await runPostCommitAudit(
        () => recordAdminAuditEvent({
        action: "video_generation.publish.approve",
        permission: "video.manage",
        resourceType: "video_generation_requests",
        resourceId: id,
        metadata: { category: current.category, approvalChecks: REQUIRED_VIDEO_APPROVAL_CHECKS.length, approvalSnapshotHash, catalogVideoId: catalog.id, catalogApprovalRecorded: true },
        }),
        (auditError) => console.error("[api/admin/video-generation] audit event failed after committed mutation:", auditError),
      );
      return NextResponse.json({ ok: true, auditRecorded, approvalStatus: 'approved', catalogApprovalRecorded: true,
        note: 'تم تسجيل الاعتماد البشري للمكتبة الداخلية. لن يحدث نشر فوري؛ سيعيد العامل التحقق من بصمة الفيديو والوسائط والقنوات قبل أي نشر مجدول.' });
    }

    if (action === "retry_publish") {
      return NextResponse.json(
        {
          ok: false,
          code: "EXTERNAL_VIDEO_PUBLISHING_RETIRED",
          error: "إعادة النشر على المنصات الخارجية متوقفة. إعادة توليد الفيديو الداخلي متاحة من طابور ZIKR.",
        },
        { status: 410, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        error: 'تغيير حالة الفيديو يدويًا متوقف؛ يستخدم العامل انتقالات الطابور، وتتم إعادة المحاولة عبر المسار المخصص للعمليات الفاشلة.',
        code: 'DIRECT_VIDEO_STATUS_MUTATION_RETIRED',
      },
      { status: 410, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api/admin/video-generation] PATCH:', error);
    return NextResponse.json({ error: 'تعذر تحديث العملية.' }, { status: 500 });
  }
}
