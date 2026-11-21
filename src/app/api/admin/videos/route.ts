import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/features/admin/services/admin';
import { getAllVideoRequests } from '@/features/videos/services/video-automation';
import { canViewVideoRequestRow } from '@/features/videos/services/video-audience-visibility';
import { getVideoEngineConfig } from '@/features/videos/providers/types';
import { resolveCloudinaryVideoPoster } from '@/features/videos/services/video-media-url';

export async function GET() {
  try {
    const auth = await requireAdminApi('video.manage');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    }
    const kidsAuth = await requireAdminApi('kids.manage');
    const canManageKids = kidsAuth.ok && kidsAuth.profile.id === auth.profile.id;
    const requests = await getAllVideoRequests();
    const staleBefore = Date.now() - getVideoEngineConfig().staleAfterMinutes * 60_000;
    const visibleRequests = requests
      .filter((request) => canViewVideoRequestRow(request, canManageKids))
      .map((request) => ({
        ...request,
        // Requests created by earlier renderer versions did not persist thumbnail_url.
        // Recover the real Cloudinary first-frame poster without mutating stored data.
        thumbnail_url: request.thumbnail_url || resolveCloudinaryVideoPoster(request.video_url),
        stale_processing: request.status === 'processing' && Date.parse(request.updated_at) < staleBefore,
      }));
    return NextResponse.json(visibleRequests, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api] Failed to fetch video requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video requests' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
