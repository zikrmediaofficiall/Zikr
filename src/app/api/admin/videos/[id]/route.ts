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
import { deleteVerifiedGeneratedCloudinaryVideo } from '@/features/videos/services/generated-cloudinary-asset';

const VIDEO_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function duplicateCanonicalId(request: VideoGenerationRequest): string | null {
  if (request.status !== 'cancelled' || !/duplicate generated content/i.test(request.error_message ?? '')) return null;
  const match = (request.error_details ?? '').match(/belongs to request\\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

function hasRetainedMediaInContent(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  const content = value as Record<string, unknown>;
  return [
    'audioUrl', 'humanAudioUrl', 'audioMediaAssetId', 'audioMediaAssetOwnerId',
    'videoUrl', 'generatedVideoUrl', 'thumbnailUrl',
  ].some((key) => typeof content[key] === 'string' && String(content[key]).trim().length > 0) ||
    content.audioSource === 'human_recording';
}

async function deleteUnreferencedDuplicateAsset(
  requestRow: VideoGenerationRequest,
  requestId: string,
  expectedUpdatedAt: string,
): Promise<{ publicId: string }> {
  const canonicalId = duplicateCanonicalId(requestRow);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
  if (!canonicalId || canonicalId === requestId || !requestRow.video_url || !cloudName) {
    throw new Error('DUPLICATE_ASSET_NOT_ELIGIBLE');
  }
  if (
    requestRow.status !== 'cancelled' ||
    !/duplicate generated content; publication skipped/i.test(requestRow.error_message ?? '') ||
    requestRow.updated_at !== expectedUpdatedAt ||
    requestRow.thumbnail_url ||
    requestRow.youtube_id ||
    requestRow.facebook_id ||
    requestRow.heygen_video_id ||
    requestRow.provider_job_id ||
    hasRetainedMediaInContent(requestRow.content)
  ) {
    throw new Error('DUPLICATE_ASSET_HAS_RETAINED_REFERENCES');
  }

  const canonicalRows = await supabaseServerAdminRequest<Array<{
    id: string; status: string; video_url: string | null; source_hash: string | null; content_hash: string | null;
  }>>(
    `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(canonicalId)}&select=id,status,video_url,source_hash,content_hash&limit=1`,
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

  const encodedVideoUrl = encodeURIComponent(requestRow.video_url);
  const references = await Promise.all([
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/videos?slug=eq.zikr-${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/videos?metadata->>videoGenerationRequestId=eq.${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/social_publish_queue?content_id=eq.${encodeURIComponent(requestId)}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/social_publish_queue?video_url=eq.${encodedVideoUrl}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/media_assets?url=eq.${encodedVideoUrl}&select=id&limit=1`,
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      `/rest/v1/video_generation_requests?id=neq.${encodeURIComponent(requestId)}&video_url=eq.${encodedVideoUrl}&select=id&limit=1`,
    ),
  ]);
  if (references.some((rows) => !Array.isArray(rows) || rows.length > 0)) {
    throw new Error('DUPLICATE_ASSET_STILL_REFERENCED');
  }

  // The Cloudinary search API must independently confirm the exact public ID
  // and the ZIKR automated ownership tags before any media deletion can occur.
  const deletedAsset = await deleteVerifiedGeneratedCloudinaryVideo(requestRow.video_url);
  const clearedRows = await supabaseServerAdminRequest<Array<{ id: string; updated_at: string }>>(
    `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(requestId)}&status=eq.cancelled&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ video_url: null, updated_at: new Date().toISOString() }),
    },
  );
  if (!Array.isArray(clearedRows) || clearedRows.length !== 1 || !clearedRows[0]?.updated_at) {
    throw new Error('DUPLICATE_FILE_DELETED_ROW_CLEANUP_PENDING');
  }

  const deletedRows = await supabaseServerAdminRequest<Array<{ deleted_id: string }>>(
    '/rest/v1/rpc/admin_delete_unreferenced_video_generation_request',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        p_request_id: requestId,
        p_expected_updated_at: clearedRows[0].updated_at,
      }),
    },
  );
  if (deletedRows?.length !== 1 || deletedRows[0]?.deleted_id !== requestId) {
    throw new Error('DUPLICATE_FILE_DELETED_ROW_CLEANUP_PENDING');
  }
  return deletedAsset;
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
    let deletedCloudinaryPublicId: string | null = null;
    if (canonicalDuplicateId && current.video_url) {
      const deletedAsset = await deleteUnreferencedDuplicateAsset(current, id, body.expectedUpdatedAt);
      deletedCloudinaryPublicId = deletedAsset.publicId;
    }
    const deleteExpectedUpdatedAt = deletedCloudinaryPublicId
      ? (await supabaseServerAdminRequest<Array<{ updated_at: string }>>(
          `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&select=updated_at&limit=1`,
        ))?.[0]?.updated_at
      : body.expectedUpdatedAt;
    if (!deleteExpectedUpdatedAt) {
      return NextResponse.json({ error: 'تم حذف ملف النسخة المكررة، لكن تعذر تأكيد تنظيف سجل الطلب. حدّث الصفحة ولا تعاود النشر.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const deletedRows = await supabaseServerAdminRequest<Array<{ deleted_id: string }>>('/rest/v1/rpc/admin_delete_unreferenced_video_generation_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ p_request_id: id, p_expected_updated_at: deleteExpectedUpdatedAt }),
    });
    if (deletedRows?.length !== 1 || deletedRows[0]?.deleted_id !== id) return NextResponse.json({ error: 'لم يُحذف الطلب؛ حدّث القائمة وتحقق من مراجع الوسائط.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
        action: 'video_generation.delete_unreferenced', permission: 'video.delete', resourceType: 'video_generation_requests', resourceId: id,
        metadata: { previousStatus: current.status, audience: audience.audience, mediaAndReferencesVerifiedAbsent: true, duplicateCanonicalRequestId: canonicalDuplicateId, cloudinaryPublicId: deletedCloudinaryPublicId },
      }),
      error => console.error('[api/admin/videos/[id]] delete audit failed after committed deletion:', error),
    );
    return NextResponse.json({ ok: true, deletedId: id, auditRecorded }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'DUPLICATE_FILE_DELETED_ROW_CLEANUP_PENDING') {\n      console.error('[api/admin/videos/[id]] Cloudinary asset was deleted but request-row cleanup needs reconciliation:', id);\n      return NextResponse.json({ error: 'حُذف ملف النسخة المكررة من Cloudinary، لكن سجل الطلب لم يُحذف بسبب تعارض في البيانات. حدّث القائمة وتواصل مع المسؤول قبل أي إعادة نشر.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });\n    }\n    if (/^DUPLICATE_/.test(message)) {\n      return NextResponse.json({ error: 'لم يُحذف الملف: لم ينجح التحقق من أن النسخة مكررة وخالية تمامًا من المراجع. لم يتم حذف بيانات أخرى.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });\n    }\n    if (/VIDEO_REQUEST_DELETE_(?:CONFLICT|NOT_TERMINAL|HAS_MEDIA|REFERENCED_BY_)/.test(message)) {
      return NextResponse.json({ error: 'تعذر حذف الطلب: حالته تغيرت أو ما زال مرتبطًا بوسيط أو سجل في المكتبة أو طابور النشر. لم يُحذف أي شيء.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('[api/admin/videos/[id]] DELETE:', error);
    return NextResponse.json({ error: 'تعذر حذف طلب الفيديو.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
