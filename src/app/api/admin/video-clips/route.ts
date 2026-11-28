import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/features/admin/services/admin';
import { requireAdminStepUpApi } from '@/features/admin/services/security';
import { recordAdminAuditEvent } from '@/features/admin/services/audit';
import { runPostCommitAudit } from '@/features/admin/services/post-commit-audit';
import { readBoundedJsonBody } from '@/lib/request/bounded-json-body';
import { supabaseServerAdminRequest } from '@/lib/supabase/admin-rest';
import { validateClipRow, type ClipCategory, type ClipLibraryRow, type ClipSourceKind } from '@/features/videos/providers/clip-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set<ClipCategory>(['quran', 'hadith', 'dua', 'adhkar', 'story', 'kids', 'general']);
const SOURCES = new Set<ClipSourceKind>(['flow_manual', 'owned_original', 'stock_licensed', 'other_documented']);
const SELECT_FIELDS = [
  'id', 'title', 'category', 'audience', 'video_url', 'cloudinary_public_id',
  'width', 'height', 'duration_seconds', 'audio_muted', 'source_kind',
  'rights_license', 'rights_evidence', 'rights_reviewer', 'rights_reviewed_at',
  'status', 'times_used', 'created_at',
].join(',');

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isMissingClipTable(error: unknown): boolean {
  return error instanceof Error && /video_clip_library|PGRST205|42P01|does not exist/i.test(error.message);
}

async function recordClipAudit(action: string, id: string, metadata?: JsonRecord) {
  return runPostCommitAudit(
    () => recordAdminAuditEvent({
      action,
      permission: 'video.manage',
      resourceType: 'video_clip_library',
      resourceId: id,
      metadata,
    }),
    (error) => console.warn('[api/admin/video-clips] audit unavailable after commit:', error),
  );
}

export async function GET() {
  const auth = await requireAdminApi('video.manage');
  if (!auth.ok) return responseError(auth.error, auth.status);

  try {
    const rows = await supabaseServerAdminRequest<ClipLibraryRow[]>(
      '/rest/v1/video_clip_library?select=' + encodeURIComponent(SELECT_FIELDS) +
        '&order=created_at.desc,id.asc&limit=100',
      { method: 'GET', timeoutMs: 12000, retries: 1 },
    );
    return NextResponse.json({ clips: Array.isArray(rows) ? rows : [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (isMissingClipTable(error)) {
      return responseError('جدول مكتبة المقاطع غير مفعّل بعد؛ ملف الـ migration محضّر ولم يُطبّق على قاعدة الإنتاج.', 503);
    }
    console.error('[api/admin/video-clips] GET failed:', error);
    return responseError('تعذر تحميل مكتبة المقاطع.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminStepUpApi('video.manage', '/admin/video/studio');
  if (!auth.ok) {
    return NextResponse.json({
      error: auth.error,
      nextPath: 'nextPath' in auth ? auth.nextPath : undefined,
    }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  }

  const bodyResult = await readBoundedJsonBody(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) return responseError(bodyResult.error, bodyResult.status);
  if (!isRecord(bodyResult.value)) return responseError('بيانات المقطع غير صالحة.');

  const body = bodyResult.value;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() as ClipCategory : null;
  const audience = body.audience === 'kids' ? 'kids' : body.audience === 'general' ? 'general' : null;
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  const publicId = typeof body.cloudinaryPublicId === 'string' ? body.cloudinaryPublicId.trim() : '';
  const width = Number(body.width);
  const height = Number(body.height);
  const durationSeconds = Number(body.durationSeconds);
  const sourceKind = typeof body.sourceKind === 'string' ? body.sourceKind as ClipSourceKind : null;
  const license = typeof body.rightsLicense === 'string' ? body.rightsLicense.trim() : '';
  const evidence = typeof body.rightsEvidence === 'string' ? body.rightsEvidence.trim() : '';

  if (
    title.length < 1 || title.length > 120 ||
    !category || !CATEGORIES.has(category) ||
    !audience ||
    !videoUrl || videoUrl.length > 2048 ||
    !publicId || publicId.length > 255 ||
    !Number.isInteger(width) || width < 720 || width > 3840 ||
    !Number.isInteger(height) || height < 720 || height > 3840 ||
    !Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 60 ||
    !sourceKind || !SOURCES.has(sourceKind) ||
    license.length < 1 || license.length > 200 ||
    evidence.length < 1 || evidence.length > 500 ||
    body.audioMuted !== true
  ) {
    return responseError('أكمل بيانات المقطع بدقة: Cloudinary، الدقة، المدة، كتم الصوت، المصدر ومرجع الترخيص.');
  }

  const reviewedAt = new Date().toISOString();
  const reviewer = (auth.profile.display_name || auth.profile.email || auth.profile.id).trim().slice(0, 120);
  const candidate: ClipLibraryRow = {
    id: 'pending',
    title,
    category,
    audience,
    video_url: videoUrl,
    cloudinary_public_id: publicId,
    width,
    height,
    duration_seconds: durationSeconds,
    audio_muted: true,
    source_kind: sourceKind,
    rights_license: license,
    rights_evidence: evidence,
    rights_reviewer: reviewer,
    rights_reviewed_at: reviewedAt,
    status: 'approved',
    times_used: 0,
    created_at: reviewedAt,
  };
  const validation = validateClipRow(candidate);
  if (!validation.ok) return responseError(validation.reason, 422);

  try {
    const rows = await supabaseServerAdminRequest<ClipLibraryRow[]>(
      '/rest/v1/video_clip_library?select=' + encodeURIComponent(SELECT_FIELDS),
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          title,
          category,
          audience,
          video_url: videoUrl,
          cloudinary_public_id: publicId,
          width,
          height,
          duration_seconds: durationSeconds,
          audio_muted: true,
          source_kind: sourceKind,
          rights_license: license,
          rights_evidence: evidence,
          rights_reviewer: reviewer,
          rights_reviewed_at: reviewedAt,
          status: 'pending',
          created_by: auth.profile.id,
        }),
        timeoutMs: 12000,
      },
    );
    const created = rows?.[0];
    if (!created?.id) throw new Error('Supabase did not return the created clip row.');
    const auditRecorded = await recordClipAudit('video.clip.create', created.id, {
      category,
      audience,
      sourceKind,
      status: 'pending',
    });
    return NextResponse.json({ clip: created, auditRecorded }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (isMissingClipTable(error)) {
      return responseError('جدول مكتبة المقاطع غير مفعّل بعد؛ لم يتم تنفيذ أي تغيير.', 503);
    }
    console.error('[api/admin/video-clips] POST failed:', error);
    return responseError('تعذر حفظ بيانات المقطع.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminStepUpApi('video.manage', '/admin/video/studio');
  if (!auth.ok) {
    return NextResponse.json({
      error: auth.error,
      nextPath: 'nextPath' in auth ? auth.nextPath : undefined,
    }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  }

  const bodyResult = await readBoundedJsonBody(request, 4 * 1024);
  if (!bodyResult.ok) return responseError(bodyResult.error, bodyResult.status);
  if (!isRecord(bodyResult.value)) return responseError('بيانات الإجراء غير صالحة.');

  const id = typeof bodyResult.value.id === 'string' ? bodyResult.value.id.trim() : '';
  const action = typeof bodyResult.value.action === 'string' ? bodyResult.value.action : '';
  if (!UUID_PATTERN.test(id) || !['approve', 'retire'].includes(action)) {
    return responseError('المقطع أو الإجراء غير صالح.');
  }

  try {
    const rows = await supabaseServerAdminRequest<ClipLibraryRow[]>(
      '/rest/v1/video_clip_library?id=eq.' + encodeURIComponent(id) +
        '&select=' + encodeURIComponent(SELECT_FIELDS) + '&limit=1',
      { method: 'GET', timeoutMs: 10000 },
    );
    const current = rows?.[0];
    if (!current) return responseError('المقطع غير موجود.', 404);

    let nextStatus: 'approved' | 'retired';
    let statusFilter: string;
    if (action === 'approve') {
      if (current.status !== 'pending') return responseError('لا يمكن اعتماد هذا المقطع من حالته الحالية.', 409);
      const validation = validateClipRow({ ...current, status: 'approved' });
      if (!validation.ok) return responseError(validation.reason, 422);
      nextStatus = 'approved';
      statusFilter = '&status=eq.pending';
    } else {
      if (current.status !== 'pending' && current.status !== 'approved') {
        return responseError('المقطع متقاعد بالفعل أو لا يمكن تقاعده.', 409);
      }
      nextStatus = 'retired';
      statusFilter = '&status=in.(pending,approved)';
    }

    const approvalReviewer = (auth.profile.display_name || auth.profile.email || auth.profile.id).trim().slice(0, 120);
    const approvalReviewedAt = new Date().toISOString();
    const approvalMetadata = action === 'approve'
      ? { rights_reviewer: approvalReviewer, rights_reviewed_at: approvalReviewedAt }
      : {};

    const updated = await supabaseServerAdminRequest<ClipLibraryRow[]>(
      '/rest/v1/video_clip_library?id=eq.' + encodeURIComponent(id) + statusFilter +
        '&select=' + encodeURIComponent(SELECT_FIELDS),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: nextStatus, ...approvalMetadata }),
        timeoutMs: 10000,
      },
    );
    const changed = updated?.[0];
    if (!changed) return responseError('تغيرت حالة المقطع بالتزامن؛ حدّث القائمة وحاول مرة أخرى.', 409);
    const auditRecorded = await recordClipAudit('video.clip.' + action, id, {
      previousStatus: current.status,
      status: nextStatus,
      ...(action === 'approve' ? {
        rightsReviewer: approvalReviewer,
        rightsReviewedAt: approvalReviewedAt,
      } : {}),
    });
    return NextResponse.json({ clip: changed, auditRecorded }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (isMissingClipTable(error)) {
      return responseError('جدول مكتبة المقاطع غير مفعّل بعد؛ لم يتم تنفيذ أي تغيير.', 503);
    }
    console.error('[api/admin/video-clips] PATCH failed:', error);
    return responseError('تعذر تحديث حالة المقطع.', 500);
  }
}
