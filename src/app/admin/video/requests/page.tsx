import { Container } from "@/components/ui/container";
import AdminVideoRequestsClient from "@/features/admin/video-requests/components/admin-video-requests-client";
import { AdminBreadcrumbs } from "@/features/admin/components/admin-breadcrumbs";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { hasAdminPermission } from "@/features/admin/services/permissions";

export const dynamic = "force-dynamic";

export default async function AdminVideoRequestsPage() {
  const admin = await requireAdminPermission("video.manage");
  const canManageKids = hasAdminPermission(admin.role, "kids.manage");
  return (
    <Container className="py-8">
      <AdminBreadcrumbs current="طلبات الفيديو" />
      <AdminVideoRequestsClient canManageKids={canManageKids} />
    </Container>
  );
}
