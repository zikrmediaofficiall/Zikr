"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { buildWorkflowDefinition, parseFacts } from "@/features/automation/workflow-designer";
import { approveRun, saveWorkflow, setWorkflowEnabled, startRun } from "@/features/automation/workflow-store";

const BASE = "/admin/omnis/workflows";
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(field(f, k));
const back = (kind: "ok" | "error", message: string, key?: string): never =>
  redirect(`${BASE}?${key ? `key=${encodeURIComponent(key)}&` : ""}${kind}=${encodeURIComponent(message)}`);

async function audit(event: Parameters<typeof recordAdminAuditEvent>[0]) {
  await runPostCommitAudit(() => recordAdminAuditEvent(event), (error) => console.error("[admin/omnis/workflows] audit failed after committed mutation:", error));
}

export async function saveWorkflowAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.workflow.save", 20, 60);
  const { def, errors } = buildWorkflowDefinition({
    key: field(formData, "key"), triggerType: field(formData, "triggerType"), triggerName: field(formData, "triggerName"),
    conditions: field(formData, "conditions"), actions: field(formData, "actions"), verification: field(formData, "verification"),
    maxAttempts: num(formData, "maxAttempts"), baseDelayMs: num(formData, "baseDelayMs"), timeoutMs: num(formData, "timeoutMs"), perHour: num(formData, "perHour"),
  });
  if (!def) back("error", errors.slice(0, 3).join(" | "));
  else {
    await saveWorkflow(def, admin.id);
    await audit({ action: "omnis.workflow.save", permission: "system.manage", resourceType: "automation_workflow", resourceId: def.key });
    revalidatePath(BASE);
    back("ok", "حُفظ سير العمل معطّلًا. جرّبه بتشغيل تجريبي ثم فعّله.", def.key);
  }
}

export async function toggleWorkflowAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.workflow.toggle", 30, 60);
  const key = field(formData, "key");
  const enabled = field(formData, "enabled") === "true";
  await setWorkflowEnabled(key, enabled);
  await audit({ action: enabled ? "omnis.workflow.enable" : "omnis.workflow.disable", permission: "system.manage", resourceType: "automation_workflow", resourceId: key });
  revalidatePath(BASE);
  back("ok", enabled ? "فُعّل سير العمل." : "أُوقف سير العمل (مفتاح الإيقاف).", key);
}

export async function runWorkflowAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.workflow.run", 20, 60);
  const key = field(formData, "key");
  const dryRun = field(formData, "mode") !== "live";
  const outcome = await startRun({ key, facts: parseFacts(field(formData, "facts")), dryRun, actorId: admin.id });
  await audit({ action: dryRun ? "omnis.workflow.dry_run" : "omnis.workflow.run", permission: "system.manage", resourceType: "automation_workflow", resourceId: key, metadata: { status: outcome.status, reason: outcome.reason ?? null } });
  revalidatePath(BASE);
  back("ok", `النتيجة: ${outcome.status}${outcome.reason ? ` (${outcome.reason})` : ""}`, key);
}

export async function approveRunAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.workflow.approve", 20, 60);
  const outcome = await approveRun(field(formData, "runId"), admin.id);
  await audit({ action: "omnis.workflow.approve", permission: "system.manage", resourceType: "automation_run", resourceId: field(formData, "runId"), metadata: { status: outcome.status, reason: outcome.reason ?? null } });
  revalidatePath(BASE);
  back("ok", `النتيجة: ${outcome.status}${outcome.reason ? ` (${outcome.reason})` : ""}`);
}
