import { requireAdminPermission } from '@/features/admin/services/admin';
import { AdminVideoClipsClient } from '@/features/admin/video-studio/components/admin-video-clips-client';

export const dynamic = 'force-dynamic';

export default async function AdminVideoClipsPage() {
  await requireAdminPermission('video.manage');
  return <AdminVideoClipsClient />;
}
