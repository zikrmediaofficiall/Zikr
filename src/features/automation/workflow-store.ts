import "server-only";

import { revalidatePath } from "next/cache";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import {
  decideRun,
  idempotencyKey,
  isAutomationEngineEnabled,
  runWorkflow,
  validateWorkflowDefinition,
  type AttemptOutcome,
  type WorkflowAction,
  type WorkflowDefinition,
} from "./workflow-engine";

export type StoredWorkflow = { key: string; definition: WorkflowDefinition; enabled: boolean; updated_at: string };
export type StoredRun = { id: string; workflow_key: string; mode: string; status: string; attempts: number; approved_by: string | null; detail: Record<string, unknown>; created_at: string };
export type StoredDeadLetter = { id: string; run_id: string; failed_action: string; attempts: number; error: string | null; created_at: string; resolved_at: string | null };

const rest = <T>(path: string, init?: Parameters<typeof supabaseServerAdminRequest>[1]) => supabaseServerAdminRequest<T>(`/rest/v1/${path}`, init ?? { method: "GET" });
const enc = encodeURIComponent;

export const isKillSwitchOn = (env: Record<string, string | undefined> = process.env) => env.AUTOMATION_KILL_SWITCH === "true";

export async function listWorkflows(): Promise<StoredWorkflow[]> {
  return rest<StoredWorkflow[]>("automation_workflows?select=key,definition,enabled,updated_at&order=updated_at.desc&limit=100");
}
export async function listRuns(limit = 40): Promise<StoredRun[]> {
  return rest<StoredRun[]>(`automation_runs?select=id,workflow_key,mode,status,attempts,approved_by,detail,created_at&order=created_at.desc&limit=${limit}`);
}
export async function listDeadLetters(): Promise<StoredDeadLetter[]> {
  return rest<StoredDeadLetter[]>("automation_dead_letters?select=id,run_id,failed_action,attempts,error,created_at,resolved_at&resolved_at=is.null&order=created_at.desc&limit=50");
}

export async function saveWorkflow(def: WorkflowDefinition, actorId: string): Promise<void> {
  if (validateWorkflowDefinition(def).length) throw new Error("invalid workflow definition");
  // A saved definition always starts disabled, including when an existing workflow is edited.
  await rest("automation_workflows?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: def.key, definition: def, enabled: false, created_by: actorId, updated_at: new Date().toISOString() }),
  });
}

export async function setWorkflowEnabled(key: string, enabled: boolean): Promise<void> {
  await rest(`automation_workflows?key=eq.${enc(key)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ enabled, updated_at: new Date().toISOString() }),
  });
}

async function runAction(action: WorkflowAction, workflowKey: string, runId: string, actorId: string): Promise<AttemptOutcome> {
  if (action.type === "notify_admin") {
    await recordAdminAuditEvent({
      action: "omnis.automation.notify",
      permission: "system.manage",
      resourceType: "automation_run",
      resourceId: runId,
      metadata: { workflow: workflowKey, message: String(action.params?.message ?? "").slice(0, 300), actor: actorId },
    });
    return { ok: true };
  }
  if (action.type === "revalidate_path") {
    const path = String(action.params?.path ?? "");
    if (!/^\/[A-Za-z0-9/_-]{0,120}$/.test(path)) return { ok: false };
    revalidatePath(path);
    return { ok: true };
  }
  // pause_queue, resume_queue and create_incident are valid in a definition but not wired to a live executor yet:
  // they fail closed into the dead-letter list instead of pretending to run.
  return { ok: false };
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function execute(run: { id: string; workflow_key: string }, def: WorkflowDefinition, actorId: string): Promise<StoredRun["status"]> {
  const result = await runWorkflow(
    def,
    (action) => withTimeout(runAction(action, run.workflow_key, run.id, actorId), def.timeoutMs).catch(() => ({ ok: false, timedOut: true })),
    (ms) => new Promise((resolve) => setTimeout(resolve, Math.min(ms, 3000))),
  );
  await rest(`automation_runs?id=eq.${enc(run.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: result.status, attempts: result.attempts, finished_at: new Date().toISOString(), detail: { verification: "not machine-checked; expectation: " + (def.verification?.expect ?? ""), failed_action: result.failedAction ?? null } }),
  });
  if (result.status === "dead_letter") {
    await rest("automation_dead_letters", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ run_id: run.id, failed_action: result.failedAction ?? "unknown", attempts: result.attempts, error: "action failed or is not wired to an executor" }),
    });
  }
  return result.status;
}

export type StartOutcome = { status: string; runId?: string; reason?: string };

/** Manual run. Dry run is the default and records what would happen without executing anything. */
export async function startRun(input: { key: string; facts: Record<string, string | number | boolean>; dryRun: boolean; actorId: string; now?: number }): Promise<StartOutcome> {
  const rows = await rest<StoredWorkflow[]>(`automation_workflows?select=key,definition,enabled,updated_at&key=eq.${enc(input.key)}&limit=1`);
  const workflow = rows[0];
  if (!workflow) return { status: "skipped", reason: "workflow_not_found" };
  const mode = input.dryRun ? "dry_run" : "live";
  const now = input.now ?? Date.now();
  const idem = idempotencyKey(input.key, "manual:" + JSON.stringify(input.facts), 5 * 60 * 1000, now);
  const existing = await rest<Array<{ id: string }>>(`automation_runs?select=id&workflow_key=eq.${enc(input.key)}&idempotency_key=eq.${idem}&mode=eq.${mode}&limit=1`);
  const hourAgo = new Date(now - 3600_000).toISOString();
  const recent = await rest<Array<{ id: string }>>(`automation_runs?select=id&workflow_key=eq.${enc(input.key)}&mode=eq.live&created_at=gte.${enc(hourAgo)}&limit=700`);
  const decision = decideRun({
    def: workflow.definition,
    facts: input.facts,
    engineEnabled: isAutomationEngineEnabled(),
    killSwitch: isKillSwitchOn() || (!workflow.enabled && !input.dryRun),
    alreadyRan: existing.length > 0,
    runsLastHour: recent.length,
    dryRun: input.dryRun,
    approved: false,
  });
  if (decision.kind === "skip") return { status: "skipped", reason: decision.reason };
  const status = decision.kind === "dry_run" ? "skipped" : decision.kind === "needs_approval" ? "needs_approval" : "running";
  const created = await rest<Array<{ id: string }>>("automation_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ workflow_key: input.key, idempotency_key: idem, mode, status, detail: { requested_by: input.actorId, facts: input.facts, planned_actions: decision.actions } }),
  });
  const runId = created[0]?.id;
  if (!runId) return { status: "skipped", reason: "run_not_recorded" };
  if (decision.kind === "execute") return { status: await execute({ id: runId, workflow_key: input.key }, workflow.definition, input.actorId), runId };
  return { status, runId };
}

/** Approval by a different admin than the requester (separation of duties), then execution. */
export async function approveRun(runId: string, approverId: string): Promise<StartOutcome> {
  const runs = await rest<Array<StoredRun>>(`automation_runs?select=id,workflow_key,mode,status,attempts,approved_by,detail,created_at&id=eq.${enc(runId)}&limit=1`);
  const run = runs[0];
  if (!run || run.status !== "needs_approval" || run.mode !== "live") return { status: "skipped", reason: "not_awaiting_approval" };
  if (run.detail.requested_by === approverId) return { status: "skipped", reason: "approver_must_differ_from_requester" };
  if (!isAutomationEngineEnabled() || isKillSwitchOn()) return { status: "skipped", reason: "engine_disabled_or_kill_switch" };
  const rows = await rest<StoredWorkflow[]>(`automation_workflows?select=key,definition,enabled,updated_at&key=eq.${enc(run.workflow_key)}&limit=1`);
  if (!rows[0]?.enabled) return { status: "skipped", reason: "workflow_disabled" };
  const claimed = await rest<Array<{ id: string }>>(`automation_runs?id=eq.${enc(runId)}&status=eq.needs_approval`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "running", approved_by: approverId }),
  });
  if (!claimed.length) return { status: "skipped", reason: "already_claimed" };
  return { status: await execute({ id: runId, workflow_key: run.workflow_key }, rows[0].definition, approverId), runId };
}
