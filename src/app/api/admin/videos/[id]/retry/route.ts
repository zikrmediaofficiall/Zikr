import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/features/admin/services/admin';
import { requireAdminStepUpApi } from '@/features/admin/services/security';
import { resolveVideoRequestAudience } from '@/features/videos/services/video-audience-visibility';
import { recordAdminAuditEvent } from '@/features/admin/services/audit';
import { runPostCommitAudit } from '@/features/admin/services/post-commit-audit';
import { supabaseServerAdminRequest } from '@/lib/supabase/server';
import { updateVideoRequestStatus } from '@/features/videos/services/video-automation';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminStepUpApi('video.manage', '/admin/video/requests');
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, nextPath: 'nextPath' in auth ? auth.nextPath : undefined },
        { status: auth.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid video request ID' }, { status: 400 });
    }
    const currentRows = await supabaseServerAdminRequest<Array<{ status: string; content: unknown; updated_at: string }>>(
      `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&select=status,content,updated_at&limit=1`,
    );
    if (!Array.isArray(currentRows)) throw new Error("Video retry lookup returned an invalid row set.");
    const current = currentRows[0];
    if (!current) {
      return NextResponse.json({ error: 'Video request not found' }, { status: 404 });
    }
    if (current.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed video requests can be retried' }, { status: 409 });
    }
    const audience = resolveVideoRequestAudience(current.content);
    if (!audience.ok) {
      return NextResponse.json(
        { error: 'Video request audience metadata is invalid; retry is blocked until it is corrected.' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (audience.audience === 'kids') {
      const kidsAuth = await requireAdminApi('kids.manage');
      if (!kidsAuth.ok) {
        return NextResponse.json(
          { error: kidsAuth.error },
          { status: kidsAuth.status, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      if (kidsAuth.profile.id !== auth.profile.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (!current.updated_at || !Number.isFinite(Date.parse(current.updated_at))) {
      return NextResponse.json({ error: 'Video request revision is invalid; refresh before retrying.' }, { status: 409 });
    }

    const success = await updateVideoRequestStatus(id, 'pending', undefined, 'failed', current.updated_at);
    
    if (!success) {
      return NextResponse.json(
        { error: 'The video request changed before retry could be claimed. Refresh the queue and try again.' },
        { status: 409 }
      );
    }
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
      action: "video_generation.retry",
      permission: "video.manage",
      resourceType: "video_generation_requests",
      resourceId: id,
      metadata: { audience: audience.audience, additionalPermission: audience.audience === 'kids' ? 'kids.manage' : null },
      }),
      (auditError) => console.error("[api/admin/videos/[id]/retry] audit event failed after committed mutation:", auditError),
    );

    return NextResponse.json({ success: true, auditRecorded });
  } catch (error) {
    console.error('[api] Failed to retry video request:', error);
    return NextResponse.json(
      { error: 'Failed to retry video request' },
      { status: 500 }
    );
  }
}
