"use server";

import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { getOmnisModuleStatusSnapshot } from "@/features/admin/services/omnis-module-status";
import { resolveOmnisSafeCommand } from "@/features/admin/omnis/commands";
import { OMNIS_DEPENDENCY_DEFINITIONS } from "@/features/admin/omnis/module-dependencies";
import { canResolveOmnisIncident } from "@/features/admin/omnis/incident-lifecycle";

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

  await supabaseServerAdminRequest<Record<string, unknown>>(
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
}

export async function runOmnisSafeCommandAction(formData: FormData) {
  const profile = await requireAdminPermission("system.manage");
  const command = resolveOmnisSafeCommand(field(formData, "command_key"));
  if (!command) throw new Error("أمر OMNIS غير مسجل أو غير مسموح.");

  const snapshot = await getOmnisModuleStatusSnapshot();
  await recordAdminAuditEvent({
    action: "admin.omnis.safe_command.inspect",
    permission: command.permission,
    resourceType: "omnis_safe_command",
    resourceId: command.key,
    metadata: {
      commandKey: command.key,
      operation: command.operation,
      executionState: "completed_read_only_probe",
      actorRole: profile.role,
      moduleCounts: snapshot.counts,
      incidentCounts: snapshot.incidentCounts,
      probeAvailable: snapshot.available,
    },
  });
  revalidatePath("/admin/omnis");
}


export async function updateOmnisIncidentLifecycleAction(formData: FormData) {
  const profile = await requireAdminStepUp("system.manage", "/admin/omnis");
  const incidentKey = field(formData, "incident_key");
  const lifecycleAction = field(formData, "lifecycle_action");
  const note = field(formData, "note");

  if (!/^omnis:[a-z0-9-]{2,80}$/.test(incidentKey)) {
    throw new Error("معرف الحادث غير صالح.");
  }
  if (!["acknowledged", "resolved"].includes(lifecycleAction)) {
    throw new Error("إجراء دورة حياة الحادث غير مدعوم.");
  }
  if (note.length > 500) {
    throw new Error("الملاحظة أطول من الحد المسموح.");
  }

  const dependencyId = incidentKey.slice("omnis:".length);
  const definition = OMNIS_DEPENDENCY_DEFINITIONS.find((item) => item.id === dependencyId);
  if (!definition) throw new Error("الاعتماد المحدد غير مسجل في خريطة OMNIS.");

  const snapshot = await getOmnisModuleStatusSnapshot();
  if (!snapshot.available || !snapshot.incidentHistoryAvailable) {
    throw new Error("فحوص التشغيل أو سجل الحوادث غير متاح؛ لم يتم تغيير الحالة.");
  }

  const latestEvent = snapshot.incidentEvents.find((event) => event.incidentKey === incidentKey);
  if (lifecycleAction === "acknowledged") {
    const incident = snapshot.incidents.find((item) => item.incidentKey === incidentKey);
    if (!incident) throw new Error("لا يمكن الإقرار بحادث غير موجود في الفحص الحالي.");
    if (incident.lifecycleState === "acknowledged") return;

    await recordAdminAuditEvent({
      action: "admin.omnis.incident.acknowledged",
      permission: "system.manage",
      resourceType: "omnis_incident",
      resourceId: incidentKey,
      metadata: {
        dependencyId,
        owner: definition.owner,
        severity: incident.severity,
        affectedModules: incident.affectedModules,
        probeCheckedAt: incident.checkedAt,
        note: note || null,
        actorRole: profile.role,
      },
    });
  } else {
    if (latestEvent?.action === "resolved") return;
    if (latestEvent?.action !== "acknowledged") {
      throw new Error("يجب الإقرار بالحادث أولًا قبل إغلاقه.");
    }
    if (snapshot.incidents.some((item) => item.incidentKey === incidentKey)) {
      throw new Error("الحادث ما زال نشطًا؛ لا يمكن إغلاقه قبل تعافي الاعتماد.");
    }

    const dependencyStatuses = snapshot.modules
      .flatMap((moduleStatus) => moduleStatus.dependencies)
      .filter((dependency) => dependency.dependencyId === dependencyId);
    if (!canResolveOmnisIncident(dependencyStatuses)) {
      throw new Error("لا يوجد دليل فحص حديث يؤكد التعافي؛ الحالات المفقودة أو القديمة لا تسمح بالإغلاق.");
    }

    await recordAdminAuditEvent({
      action: "admin.omnis.incident.resolved",
      permission: "system.manage",
      resourceType: "omnis_incident",
      resourceId: incidentKey,
      metadata: {
        dependencyId,
        owner: definition.owner,
        verifiedHealthyProbes: dependencyStatuses.length,
        note: note || null,
        actorRole: profile.role,
      },
    });
  }

  revalidatePath("/admin/omnis");
}
