import { Container } from "@/components/ui/container";
import AdminVideoRequestsClient from "@/features/admin/video-requests/components/admin-video-requests-client";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { hasAdminPermission } from "@/features/admin/services/permissions";

export const dynamic = "force-dynamic";

export default async function AdminVideoRequestsPage() {
  const admin = await requireAdminPermission("video.manage");
  const canManageKids = hasAdminPermission(admin.role, "kids.manage");
  return (
    <Container className="py-8">
      <AdminVideoRequestsClient canManageKids={canManageKids} canDelete={hasAdminPermission(admin.role, "video.delete")} />
    </Container>
  );
}
