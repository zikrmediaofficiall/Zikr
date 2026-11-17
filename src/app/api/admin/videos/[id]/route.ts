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

const VIDEO_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const deletedRows = await supabaseServerAdminRequest<Array<{ deleted_id: string }>>('/rest/v1/rpc/admin_delete_unreferenced_video_generation_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ p_request_id: id, p_expected_updated_at: body.expectedUpdatedAt }),
    });
    if (deletedRows?.length !== 1 || deletedRows[0]?.deleted_id !== id) return NextResponse.json({ error: 'لم يُحذف الطلب؛ حدّث القائمة وتحقق من مراجع الوسائط.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
        action: 'video_generation.delete_unreferenced', permission: 'video.delete', resourceType: 'video_generation_requests', resourceId: id,
        metadata: { previousStatus: current.status, audience: audience.audience, mediaAndReferencesVerifiedAbsent: true },
      }),
      error => console.error('[api/admin/videos/[id]] delete audit failed after committed deletion:', error),
    );
    return NextResponse.json({ ok: true, deletedId: id, auditRecorded }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/VIDEO_REQUEST_DELETE_(?:CONFLICT|NOT_TERMINAL|HAS_MEDIA|REFERENCED_BY_)/.test(message)) {
      return NextResponse.json({ error: 'تعذر حذف الطلب: حالته تغيرت أو ما زال مرتبطًا بوسيط أو سجل في المكتبة أو طابور النشر. لم يُحذف أي شيء.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('[api/admin/videos/[id]] DELETE:', error);
    return NextResponse.json({ error: 'تعذر حذف طلب الفيديو.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
