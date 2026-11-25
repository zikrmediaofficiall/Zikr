"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { createCampaign, transitionCampaign } from "@/features/notifications/services/push-campaign-store";
import type { CampaignStatus } from "@/features/notifications/services/push-campaign-policy";

const BASE = "/admin/omnis/push";
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (kind: "ok" | "error", message: string): never => redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);
const audit = (event: Parameters<typeof recordAdminAuditEvent>[0]) =>
  runPostCommitAudit(() => recordAdminAuditEvent(event), (error) => console.error("[admin/omnis/push] audit failed:", error));

export async function createCampaignAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.push.create", 10, 60);
  const result = await createCampaign({ title: field(formData, "title"), body: field(formData, "body"), link: field(formData, "link"), audience: field(formData, "audience") }, admin.id);
  await audit({ action: "omnis.push.campaign.create", permission: "system.manage", resourceType: "omnis_push_campaign", resourceId: null, metadata: { ok: result.ok } });
  revalidatePath(BASE);
  back(result.ok ? "ok" : "error", result.ok ? "حُفظت الحملة كمسودة. لم يُرسل شيء." : result.reason ?? "تعذر الحفظ.");
}

export async function transitionCampaignAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.push.transition", 20, 60);
  const to = field(formData, "to");
  if (to !== "approved" && to !== "rejected" && to !== "cancelled") back("error", "إجراء غير صالح.");
  const id = field(formData, "id");
  const result = await transitionCampaign(id, to as CampaignStatus, admin.id);
  await audit({ action: `omnis.push.campaign.${to}`, permission: "system.manage", resourceType: "omnis_push_campaign", resourceId: id, metadata: { ok: result.ok } });
  revalidatePath(BASE);
  back(result.ok ? "ok" : "error", result.ok ? "تم. لم يُرسل شيء: الإرسال غير موصول بعد." : result.reason ?? "تعذر التنفيذ.");
}
