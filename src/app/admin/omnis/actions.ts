"use server";

import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateOmnisExecutionTaskAction(formData: FormData) {
  const profile = await requireAdminStepUp("system.manage", "/admin/omnis");
  const taskKey = field(formData, "task_key");
  const state = field(formData, "state");
  const note = field(formData, "note");
  const commitSha = field(formData, "commit_sha").toLowerCase();
  const testsSummary = field(formData, "tests_summary");

  if (!/^OMNIS-P\d{2}-\d{2}$/.test(taskKey)) {
    throw new Error("معرف مهمة OMNIS غير صالح.");
  }
  if (!["pending", "in_progress", "blocked", "completed"].includes(state)) {
    throw new Error("حالة التنفيذ غير مدعومة.");
  }
  if (state === "blocked" && note.length < 5) {
    throw new Error("اكتب سببًا واضحًا قبل تسجيل العائق.");
  }
  if (state === "completed" && (!/^[0-9a-f]{40}$/.test(commitSha) || testsSummary.length < 10)) {
    throw new Error("لا يمكن إغلاق المهمة دون SHA صحيح وملخص اختبارات وتحقق.");
  }

  const result = await supabaseServerAdminRequest<Record<string, unknown>>(
    "/rest/v1/rpc/transition_admin_omnis_task",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_task_key: taskKey,
        p_next_state: state,
        p_actor_id: profile.id,
        p_note: note || null,
        p_commit_sha: state === "completed" ? commitSha : null,
        p_tests_summary: state === "completed" ? testsSummary : null,
      }),
    },
  );

  await runPostCommitAudit(
    () => recordAdminAuditEvent({
      action: "admin.omnis.execution.transition",
      permission: "system.manage",
      resourceType: "admin_omnis_execution_ledger",
      resourceId: taskKey,
      metadata: { state, commitSha: state === "completed" ? commitSha : null },
    }),
    (error) => console.error("[admin/omnis] transition audit failed after database commit", error),
  );

  revalidatePath("/admin/omnis");
  return result;
}
