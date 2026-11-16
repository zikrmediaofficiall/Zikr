import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/features/admin/services/admin';
import { getAllVideoRequests } from '@/features/videos/services/video-automation';
import { canViewVideoRequestRow } from '@/features/videos/services/video-audience-visibility';

export async function GET() {
  try {
    const auth = await requireAdminApi('video.manage');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
    }
    const kidsAuth = await requireAdminApi('kids.manage');
    const canManageKids = kidsAuth.ok && kidsAuth.profile.id === auth.profile.id;
    const requests = await getAllVideoRequests();
    const visibleRequests = requests.filter((request) => canViewVideoRequestRow(request, canManageKids));
    return NextResponse.json(visibleRequests, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api] Failed to fetch video requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video requests' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
