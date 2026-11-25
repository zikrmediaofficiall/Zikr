import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { hasAdminPermission } from "@/features/admin/services/permissions";
import WrittenStudioClient from "./written-studio-client";

export const dynamic = "force-dynamic";

export default async function AdminWrittenStudioPage() {
  const profile = await requireAdminPermission("social.manage");
  const canManageKids = hasAdminPermission(profile.role, "kids.manage");
  return (
    <Container className="py-8">
      <WrittenStudioClient canManageKids={canManageKids} />
    </Container>
  );
}
