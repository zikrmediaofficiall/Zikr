"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { ADMIN_ROLE_PERMISSIONS } from "@/features/admin/services/permissions";
import { canApproveProposal, isOmnisAgentsEnabled } from "@/features/admin/omnis/agents";
import { reviewProposal, submitAgentProposal } from "@/features/admin/omnis/agent-store";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

const BASE = "/admin/omnis/agents";
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (kind: "ok" | "error", message: string): never => redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);

export async function fileProposalAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.agents.file", 20, 60);
  if (!isOmnisAgentsEnabled()) back("error", "الوكلاء متوقفون (OMNIS_AGENTS_ENABLED).");
  const result = await submitAgentProposal({ agent: field(formData, "agent"), title: field(formData, "title"), target: field(formData, "target"), diff: field(formData, "diff") });
  await runPostCommitAudit(
    () => recordAdminAuditEvent({ action: "omnis.agent.proposal.file", permission: "system.manage", resourceType: "omnis_agent_proposal", resourceId: result.ok ? result.id : null, metadata: { agent: field(formData, "agent"), ok: result.ok } }),
    (error) => console.error("[admin/omnis/agents] audit failed:", error),
  );
  revalidatePath(BASE);
  back(result.ok ? "ok" : "error", result.ok ? "سُجّل الاقتراح بانتظار المراجعة." : `رُفض: ${result.reason}`);
}

export async function reviewProposalAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.agents.review", 30, 60);
  const id = field(formData, "id");
  const to = field(formData, "to");
  if (to !== "approved" && to !== "rejected" && to !== "applied") back("error", "إجراء غير صالح.");
  const rows = await supabaseServerAdminRequest<Array<{ agent_key: string }>>(`/rest/v1/omnis_agent_proposals?select=agent_key&id=eq.${encodeURIComponent(id)}&limit=1`, { method: "GET" });
  const agentKey = rows[0]?.agent_key ?? "";
  if (!canApproveProposal({ approverPermissions: ADMIN_ROLE_PERMISSIONS[admin.role as keyof typeof ADMIN_ROLE_PERMISSIONS] ?? [], agent: agentKey, approverIsAgent: false })) back("error", "لا تملك صلاحية مراجعة اقتراحات هذا الوكيل.");
  const result = await reviewProposal(id, to as "approved" | "rejected" | "applied", admin.id);
  await runPostCommitAudit(
    () => recordAdminAuditEvent({ action: `omnis.agent.proposal.${to}`, permission: "system.manage", resourceType: "omnis_agent_proposal", resourceId: id, metadata: { ok: result.ok, reason: result.reason ?? null } }),
    (error) => console.error("[admin/omnis/agents] audit failed:", error),
  );
  revalidatePath(BASE);
  back(result.ok ? "ok" : "error", result.ok ? "تم." : `تعذر: ${result.reason}`);
}
