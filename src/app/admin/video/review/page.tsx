import { Container } from "@/components/ui/container";
import { AdminBreadcrumbs } from "@/features/admin/components/admin-breadcrumbs";
import AdminVideoRequestsClient from "@/features/admin/video-requests/components/admin-video-requests-client";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { hasAdminPermission } from "@/features/admin/services/permissions";

export const dynamic = "force-dynamic";

export default async function AdminVideoReviewPage() {
  const admin = await requireAdminPermission("video.manage");
  return (
    <Container className="py-8">
      <AdminBreadcrumbs current="مراجعة الفيديوهات المتوقفة" />
      <AdminVideoRequestsClient
        canManageKids={hasAdminPermission(admin.role, "kids.manage")}
        canDelete={hasAdminPermission(admin.role, "video.delete")}
        reviewOnly
      />
    </Container>
  );
}
