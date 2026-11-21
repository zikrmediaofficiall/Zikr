import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/features/admin/services/admin';
import { requireAdminStepUpApi } from '@/features/admin/services/security';
import { readBoundedJsonBody } from '@/lib/request/bounded-json-body';
import { recordAdminAuditEvent } from '@/features/admin/services/audit';
import { runPostCommitAudit } from '@/features/admin/services/post-commit-audit';
import { supabaseServerAdminRequest } from '@/lib/supabase/server';
import type { VideoGenerationRequest } from '@/lib/types/video';
import { updateVideoRequestStatus } from '@/features/videos/services/video-automation';
import { canViewVideoRequestRow, resolveVideoRequestAudience } from '@/features/videos/services/video-audience-visibility';
import { deleteVerifiedGeneratedCloudinaryVideo, verifyGeneratedCloudinaryVideo, type VerifiedGeneratedCloudinaryVideo } from '@/features/videos/services/generated-cloudinary-asset';
import { prepareGeneratedVideoContentForDeletion } from '@/features/videos/services/video-request-deletion';

const VIDEO_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function duplicateCanonicalId(request: VideoGenerationRequest): string | null {
  if (request.status !== 'cancelled' || !/duplicate generated content/i.test(request.error_message ?? '')) return null;
  const match = (request.error_details ?? '').match(/belongs to request\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

function isQaFailedGeneratedVideo(request: VideoGenerationRequest): boolean {
  const content = request.content && typeof request.content === 'object' && !Array.isArray(request.content)
    ? request.content as Record<string, unknown> : {};
  return request.status === 'completed' && content.approvalStatus === 'qa_failed';
}

function isPendingHumanReviewGeneratedVideo(request: VideoGenerationRequest): boolean {
  const content = request.content && typeof request.content === 'object' && !Array.isArray(request.content)
    ? request.content as Record<string, unknown> : {};
  return request.status === 'completed' && content.approvalStatus === 'awaiting_human_review';
}

type PreparedGeneratedAssetDeletion = {
  originalVideoUrl: string;
  originalContent: unknown;
  verifiedAsset: VerifiedGeneratedCloudinaryVideo;
  clearedUpdatedAt: string;
  expectedStatus: VideoGenerationRequest["status"];
  qaFailed: boolean;
  pendingHumanReview: boolean;
  sharedCanonicalAsset: boolean;
};

async function prepareGeneratedCloudinaryAssetDeletion(
  requestRow: VideoGenerationRequest,
  requestId: string,
  expectedUpdatedAt: string,
): Promise<PreparedGeneratedAssetDeletion> {
  const canonicalId = duplicateCanonicalId(requestRow);
  const qaFailed = isQaFailedGeneratedVideo(requestRow);
  const pendingHumanReview = isPendingHumanReviewGeneratedVideo(requestRow);
  const terminalGeneratedAsset = requestRow.status === 'failed' || requestRow.status === 'cancelled';
  const duplicate = requestRow.status === 'cancelled' &&
    Boolean(canonicalId) &&
    /duplicate generated content; publication skipped/i.test(requestRow.error_message ?? '');
  const originalVideoUrl = requestRow.video_url;
  const contentPreparation = prepareGeneratedVideoContentForDeletion(requestRow.content, originalVideoUrl);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
  if ((!duplicate && !qaFailed && !pendingHumanReview && !terminalGeneratedAsset) || !originalVideoUrl || !cloudName) {
    throw new Error('GENERATED_ASSET_NOT_ELIGIBLE');
  }
  if (
    requestRow.updated_at !== expectedUpdatedAt ||
    requestRow.thumbnail_url ||
    requestRow.youtube_id ||
    requestRow.facebook_id ||
    requestRow.heygen_video_id ||
    requestRow.provider_job_id ||
    !contentPreparation.ok
  ) {
    throw new Error('GENERATED_ASSET_HAS_RETAINED_REFERENCES');
  }

  let sharedCanonicalAsset = false;
  if (duplicate) {
    const canonicalRows = await supabaseServerAdminRequest<Array<{
      id: string; status: string; video_url: string | null; source_hash: string | null; content_hash: string | null;
    }>>(
      `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(canonicalId!)}&select=id,status,video_url,source_hash,content_hash&limit=1`,
    );
    const canonical = canonicalRows?.[0];
    if (
      !canonical ||
      canonical.status !== 'completed' ||
      !canonical.video_url ||
      (requestRow.source_hash && canonical.source_hash !== requestRow.source_hash) ||
      (requestRow.content_hash && canonical.content_hash !== requestRow.content_hash)
    ) {
      throw new Error('DUPLICATE_CANONICAL_REQUEST_NOT_VERIFIED');
    }
    // A duplicate can point at the canonical request's exact render. Delete
    // only the duplicate row in that case; never destroy the shared MP4.
    sharedCanonicalAsset = canonical.video_url === originalVideoUrl;
  }

  const verifiedAsset = await verifyGeneratedCloudinaryVideo(originalVideoUrl);
  const encodedVideoUrl = encodeURIComponent(originalVideoUrl);
  const otherRequestRows = await supabaseServerAdminRequest<Array<{ id: string }>>(
    `/rest/v1/video_generation_requests?id=neq.${encodeURIComponent(requestId)}&video_url=eq.${encodedVideoUrl}&select=id&limit=10`,
  );
  if (!Array.isArray(otherRequestRows)) throw new Error('GENERATED_ASSET_REFERENCE_LOOKUP_INVALID');
  if (sharedCanonicalAsset) {
    if (otherRequestRows.length !== 1 || otherRequestRows[0]?.id !== canonicalId) {
      throw new Error('GENERATED_ASSET_STILL_REFERENCED');
    }
  } else if (otherRequestRows.length > 0) {
    throw new Error('GENERATED_ASSET_STILL_REFERENCED');
  }

  const referenceQueries = [
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/videos?slug=eq.zikr-${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/videos?metadata->>videoGenerationRequestId=eq.${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/social_publish_queue?content_id=eq.${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
  ];
  if (!sharedCanonicalAsset) {
    referenceQueries.push(
      supabaseServerAdminRequest<Array<{ id: string }>>(
        `/rest/v1/social_publish_queue?video_url=eq.${encodedVideoUrl}&select=id&limit=1`,
      ),
      supabaseServerAdminRequest<Array<{ id: string }>>(
        `/rest/v1/media_assets?url=eq.${encodedVideoUrl}&select=id&limit=1`,
      ),
    );
  }
  const references = await Promise.all(referenceQueries);
  if (references.some((rows) => !Array.isArray(rows) || rows.length > 0)) {
    throw new Error('GENERATED_ASSET_STILL_REFERENCED');
  }

  const approvalFilter = qaFailed
    ? '&content->>approvalStatus=eq.qa_failed'
    : pendingHumanReview ? '&content->>approvalStatus=eq.awaiting_human_review' : '';
  const clearedRows = await supabaseServerAdminRequest<Array<{ id: string; updated_at: string }>>(
    `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(requestId)}&status=eq.${encodeURIComponent(requestRow.status)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}${approvalFilter}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        video_url: null,
        content: contentPreparation.content,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!Array.isArray(clearedRows) || clearedRows.length !== 1 || !clearedRows[0]?.updated_at) {
    throw new Error('GENERATED_ASSET_CLEAR_POINTER_CONFLICT');
  }
  return {
    originalVideoUrl,
    originalContent: requestRow.content,
    verifiedAsset,
    clearedUpdatedAt: clearedRows[0].updated_at,
    expectedStatus: requestRow.status,
    qaFailed,
    pendingHumanReview,
    sharedCanonicalAsset,
  };
}

async function restoreGeneratedAssetPointer(requestId: string, prepared: PreparedGeneratedAssetDeletion) {
  const approvalFilter = prepared.qaFailed
    ? '&content->>approvalStatus=eq.qa_failed'
    : prepared.pendingHumanReview ? '&content->>approvalStatus=eq.awaiting_human_review' : '';
  const restoredRows = await supabaseServerAdminRequest<Array<{ id: string }>>(
    `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(requestId)}&status=eq.${encodeURIComponent(prepared.expectedStatus)}&updated_at=eq.${encodeURIComponent(prepared.clearedUpdatedAt)}&video_url=is.null${approvalFilter}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        video_url: prepared.originalVideoUrl,
        content: prepared.originalContent,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!Array.isArray(restoredRows) || restoredRows.length !== 1 || restoredRows[0]?.id !== requestId) {
    throw new Error('GENERATED_ASSET_RESTORE_REQUIRED');
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi('video.manage');
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await context.params;
    if (!VIDEO_REQUEST_ID_PATTERN.test(id)) return NextResponse.json({ error: 'Video request not found' }, { status: 404 });
    const result = await supabaseServerAdminRequest<VideoGenerationRequest[]>(
      `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const item = result?.[0];
    if (!item) return NextResponse.json({ error: 'Video request not found' }, { status: 404 });
    const kidsAuth = await requireAdminApi('kids.manage');
    const canManageKids = kidsAuth.ok && kidsAuth.profile.id === auth.profile.id;
    if (!canViewVideoRequestRow(item, canManageKids)) {
      return NextResponse.json({ error: 'Video request not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(item, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/admin/videos/[id]] GET:', error);
    return NextResponse.json({ error: 'تعذر تحميل تفاصيل العملية.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminStepUpApi('video.manage', '/admin/video/requests');
    if (!auth.ok) return NextResponse.json({ error: auth.error, nextPath: 'nextPath' in auth ? auth.nextPath : undefined }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    const { id } = await context.params;
    const bodyResult = await readBoundedJsonBody(request);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const body = bodyResult.value && typeof bodyResult.value === 'object' && !Array.isArray(bodyResult.value)
      ? bodyResult.value as Record<string, unknown>
      : {};
    if (body.status !== 'pending') {
      return NextResponse.json(
        { error: 'تغيير حالة العملية يتم بواسطة عامل الطابور؛ إعادة المحاولة متاحة للعمليات الفاشلة فقط.' },
        { status: 410, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const currentRows = await supabaseServerAdminRequest<Array<{ status: string; content: unknown; updated_at: string }>>(
      `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&select=status,content,updated_at&limit=1`,
    );
    if (!Array.isArray(currentRows)) throw new Error("Video retry lookup returned an invalid row set.");
    const current = currentRows[0];
    if (!current) return NextResponse.json({ error: 'Video request not found' }, { status: 404 });
    if (current.status !== 'failed') {
      return NextResponse.json({ error: 'يمكن إعادة تعيين عمليات التوليد الفاشلة فقط.' }, { status: 409 });
    }
    const audience = resolveVideoRequestAudience(current.content);
    if (!audience.ok) {
      return NextResponse.json(
        { error: 'بيانات جمهور طلب الفيديو غير صالحة؛ تم إيقاف إعادة المحاولة.' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (audience.audience === 'kids') {
      const kidsAuth = await requireAdminApi('kids.manage');
      if (!kidsAuth.ok) {
        return NextResponse.json({ error: kidsAuth.error }, { status: kidsAuth.status, headers: { 'Cache-Control': 'no-store' } });
      }
      if (kidsAuth.profile.id !== auth.profile.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (!current.updated_at || !Number.isFinite(Date.parse(current.updated_at))) {
      return NextResponse.json({ error: 'تاريخ تحديث العملية غير صالح؛ حدّث الصفحة ثم أعد المحاولة.' }, { status: 409 });
    }

    const updated = await updateVideoRequestStatus(id, 'pending', undefined, 'failed', current.updated_at);
    if (!updated) {
      return NextResponse.json(
        { error: 'تم تغيير حالة العملية أثناء إعادة المحاولة؛ حدّث الصفحة ثم أعد المحاولة.' },
        { status: 409 },
      );
    }
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
      action: 'video_generation.update',
      permission: 'video.manage',
      resourceType: 'video_generation_requests',
      resourceId: id,
      metadata: { status: 'pending', audience: audience.audience, additionalPermission: audience.audience === 'kids' ? 'kids.manage' : null, changedFields: ['status', 'approvalStatus', 'error_message', 'error_details', 'heygen_video_id', 'heygen_status', 'heygen_submitted_at', 'heygen_last_polled_at', 'youtube_id', 'facebook_id', 'video_url'] },
      }),
      (auditError) => console.error("[api/admin/videos/[id]] audit event failed after committed mutation:", auditError),
    );
    return NextResponse.json({ ok: true, auditRecorded });
  } catch (error) {
    console.error('[api/admin/videos/[id]] PATCH:', error);
    return NextResponse.json({ error: 'تعذر تحديث العملية.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminStepUpApi('video.delete', '/admin/video/requests');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.error, nextPath: 'nextPath' in auth ? auth.nextPath : undefined },
      { status: auth.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { id } = await context.params;
    if (!VIDEO_REQUEST_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'معرّف طلب الفيديو غير صالح.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const parsed = await readBoundedJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers: { 'Cache-Control': 'no-store' } });
    const body = parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value) ? parsed.value as Record<string, unknown> : {};
    if (body.confirmed !== true || typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
      return NextResponse.json({ error: 'يلزم تأكيد الحذف وإرسال نسخة الطلب الحالية.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const currentRows = await supabaseServerAdminRequest<Array<VideoGenerationRequest>>(`/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&limit=1`);
    const current = currentRows?.[0];
    if (!current) return NextResponse.json({ error: 'طلب الفيديو غير موجود.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const audience = resolveVideoRequestAudience(current.content);
    if (!audience.ok) return NextResponse.json({ error: 'بيانات جمهور الطلب غير صالحة؛ تم منع الحذف.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    if (audience.audience === 'kids') {
      const kidsAuth = await requireAdminApi('kids.manage');
      if (!kidsAuth.ok || kidsAuth.profile.id !== auth.profile.id) {
        return NextResponse.json({ error: kidsAuth.ok ? 'Unauthorized' : kidsAuth.error }, { status: kidsAuth.ok ? 401 : kidsAuth.status, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (current.updated_at !== body.expectedUpdatedAt) return NextResponse.json({ error: 'تغير الطلب بعد تحميله؛ حدّث القائمة قبل الحذف.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    const canonicalDuplicateId = duplicateCanonicalId(current);
    const canDeleteGeneratedAsset = Boolean(current.video_url) &&
      (Boolean(canonicalDuplicateId) || isQaFailedGeneratedVideo(current) || isPendingHumanReviewGeneratedVideo(current) ||
        current.status === 'failed' || current.status === 'cancelled');
    const preparedGeneratedAsset = canDeleteGeneratedAsset
      ? await prepareGeneratedCloudinaryAssetDeletion(current, id, body.expectedUpdatedAt)
      : null;
    const deleteExpectedUpdatedAt = preparedGeneratedAsset?.clearedUpdatedAt ?? body.expectedUpdatedAt;
    let deletedRows: Array<{ deleted_id: string }> | null = null;
    try {
      deletedRows = await supabaseServerAdminRequest<Array<{ deleted_id: string }>>('/rest/v1/rpc/admin_delete_unreferenced_video_generation_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ p_request_id: id, p_expected_updated_at: deleteExpectedUpdatedAt }),
      });
    } catch (error) {
      if (preparedGeneratedAsset) {
        try {
          await restoreGeneratedAssetPointer(id, preparedGeneratedAsset);
        } catch (restoreError) {
          console.error('[api/admin/videos/[id]] failed to restore duplicate Cloudinary pointer after DB rejection:', restoreError);
          throw new Error('GENERATED_ASSET_RESTORE_REQUIRED');
        }
      }
      throw error;
    }
    if (deletedRows?.length !== 1 || deletedRows[0]?.deleted_id !== id) {
      if (preparedGeneratedAsset) await restoreGeneratedAssetPointer(id, preparedGeneratedAsset);
      return NextResponse.json({ error: 'لم يُحذف الطلب؛ حدّث القائمة وتحقق من مراجع الوسائط.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    // The deletion RPC shares its advisory lock with reference-insert triggers.
    // Only after the row is gone may the verified Cloudinary asset be destroyed.
    let cloudinaryCleanupPending = false;
    const mediaPreservedForCanonicalRequest = preparedGeneratedAsset?.sharedCanonicalAsset ?? false;
    if (preparedGeneratedAsset && !mediaPreservedForCanonicalRequest) {
      try {
        await deleteVerifiedGeneratedCloudinaryVideo(preparedGeneratedAsset.verifiedAsset);
      } catch (cloudinaryError) {
        cloudinaryCleanupPending = true;
        console.error('[api/admin/videos/[id]] request deleted but Cloudinary cleanup is pending:', {
          requestId: id,
          publicId: preparedGeneratedAsset.verifiedAsset.publicId,
          error: cloudinaryError,
        });
      }
    }
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
        action: 'video_generation.delete_unreferenced', permission: 'video.delete', resourceType: 'video_generation_requests', resourceId: id,
        metadata: {
          previousStatus: current.status,
          audience: audience.audience,
          mediaAndReferencesVerifiedAbsent: !mediaPreservedForCanonicalRequest,
          mediaPreservedForCanonicalRequest,
          duplicateCanonicalRequestId: canonicalDuplicateId,
          qaFailedGeneratedVideo: preparedGeneratedAsset?.qaFailed ?? false,
          pendingHumanReviewVideo: preparedGeneratedAsset?.pendingHumanReview ?? false,
          cloudinaryPublicId: preparedGeneratedAsset?.verifiedAsset.publicId ?? null,
          cloudinaryCleanupStatus: mediaPreservedForCanonicalRequest
            ? 'preserved_for_canonical'
            : preparedGeneratedAsset ? (cloudinaryCleanupPending ? 'pending' : 'deleted') : 'not_applicable',
        },
      }),
      error => console.error('[api/admin/videos/[id]] delete audit failed after committed deletion:', error),
    );
    if (cloudinaryCleanupPending) {
      return NextResponse.json({
        ok: true,
        deletedId: id,
        auditRecorded,
        cloudinaryCleanupPending: true,
        message: 'حُذف سجل الفيديو بأمان، لكن Cloudinary لم يؤكد إزالة الملف. راجع سجل تدقيق حذف الوسائط قبل إعادة المحاولة.',
      }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({
      ok: true,
      deletedId: id,
      auditRecorded,
      mediaPreservedForCanonicalRequest,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'GENERATED_ASSET_RESTORE_REQUIRED') {
      console.error('[api/admin/videos/[id]] generated asset link needs reconciliation.');
      return NextResponse.json({ error: 'تعذر الحذف الذري وتعذر استعادة رابط الملف تلقائيًا. لم يتم حذف ملف Cloudinary؛ يلزم فحص سجل الطلب.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (message === 'GENERATED_ASSET_CLEAR_POINTER_CONFLICT') {
      return NextResponse.json({ error: 'تغير سجل النسخة أثناء التحضير؛ لم يتم حذف ملف Cloudinary.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    if (/^(?:DUPLICATE_|GENERATED_ASSET_)/.test(message)) {
      return NextResponse.json({ error: 'لم يُحذف الملف: لم ينجح التحقق من أنه ملف مولّد غير منشور وخالٍ من جميع المراجع. لم يتم حذف بيانات أخرى.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    if (/VIDEO_REQUEST_DELETE_(?:CONFLICT|NOT_TERMINAL|HAS_MEDIA|REFERENCED_BY_)/.test(message)) {
      return NextResponse.json({ error: 'تعذر حذف الطلب: حالته تغيرت أو ما زال مرتبطًا بوسيط أو سجل في المكتبة أو طابور النشر. لم يُحذف أي شيء.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('[api/admin/videos/[id]] DELETE:', error);
    return NextResponse.json({ error: 'تعذر حذف طلب الفيديو.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
