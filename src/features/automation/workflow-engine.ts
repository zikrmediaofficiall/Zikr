/**
 * OMNIS P10: workflow engine core. Pure and side-effect free: definitions are
 * validated, dry-run is the default, retries and dead-lettering are decided
 * here, and the whole engine is off unless AUTOMATION_ENGINE_ENABLED=true.
 * Actions are executed only through an injected runner, never from this file.
 */
import { createHash } from "node:crypto";

export const AUTOMATION_ACTION_TYPES = ["notify_admin", "pause_queue", "resume_queue", "revalidate_path", "create_incident"] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

/** Actions that change state or spend resources need a human approval before a live run. */
export const APPROVAL_REQUIRED_ACTIONS: readonly AutomationActionType[] = ["pause_queue", "resume_queue"];

export type WorkflowCondition = { field: string; op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte"; value: string | number | boolean };
export type WorkflowAction = { type: AutomationActionType; params?: Record<string, string | number | boolean> };
export type WorkflowDefinition = {
  key: string;
  trigger: { type: "schedule" | "event"; name: string };
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  verification: { expect: string } | null;
  retry: { maxAttempts: number; baseDelayMs: number };
  timeoutMs: number;
  rateLimit: { perHour: number };
};

export function isAutomationEngineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AUTOMATION_ENGINE_ENABLED === "true";
}

export function validateWorkflowDefinition(def: WorkflowDefinition): string[] {
  const problems: string[] = [];
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(def.key)) problems.push("key must be 3-64 chars: lowercase letters, digits, dashes");
  if (!def.trigger?.name?.trim()) problems.push("trigger name is required");
  if (!def.actions?.length) problems.push("at least one action is required");
  if (def.actions?.length > 10) problems.push("at most 10 actions");
  for (const action of def.actions ?? []) {
    if (!(AUTOMATION_ACTION_TYPES as readonly string[]).includes(action.type)) problems.push(`unknown action type: ${String(action.type)}`);
  }
  if (!def.verification?.expect?.trim()) problems.push("a verification expectation is required");
  if (!(def.retry?.maxAttempts >= 1 && def.retry.maxAttempts <= 5)) problems.push("retry.maxAttempts must be 1-5");
  if (!(def.retry?.baseDelayMs >= 100)) problems.push("retry.baseDelayMs must be at least 100");
  if (!(def.timeoutMs >= 1000 && def.timeoutMs <= 300000)) problems.push("timeoutMs must be 1000-300000");
  if (!(def.rateLimit?.perHour >= 1 && def.rateLimit.perHour <= 600)) problems.push("rateLimit.perHour must be 1-600");
  return problems;
}

export function evaluateConditions(conditions: readonly WorkflowCondition[], facts: Record<string, string | number | boolean | undefined>): boolean {
  return conditions.every((c) => {
    const actual = facts[c.field];
    if (actual === undefined) return false;
    switch (c.op) {
      case "eq": return actual === c.value;
      case "neq": return actual !== c.value;
      case "gt": return typeof actual === "number" && typeof c.value === "number" && actual > c.value;
      case "lt": return typeof actual === "number" && typeof c.value === "number" && actual < c.value;
      case "gte": return typeof actual === "number" && typeof c.value === "number" && actual >= c.value;
      case "lte": return typeof actual === "number" && typeof c.value === "number" && actual <= c.value;
    }
  });
}

/** Same workflow + same trigger event + same time bucket always yields the same key. */
export function idempotencyKey(workflowKey: string, triggerRef: string, bucketMs: number, now: number): string {
  const bucket = Math.floor(now / Math.max(1, bucketMs));
  return createHash("sha256").update(`${workflowKey}|${triggerRef}|${bucket}`).digest("hex").slice(0, 32);
}

export function retryDelayMs(attempt: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), 15 * 60 * 1000);
}

export type RunDecision =
  | { kind: "skip"; reason: "engine_disabled" | "kill_switch" | "duplicate" | "rate_limited" | "conditions_not_met" | "invalid_definition" }
  | { kind: "dry_run"; actions: AutomationActionType[] }
  | { kind: "needs_approval"; actions: AutomationActionType[] }
  | { kind: "execute"; actions: AutomationActionType[] };

export function decideRun(input: {
  def: WorkflowDefinition;
  facts: Record<string, string | number | boolean | undefined>;
  engineEnabled: boolean;
  killSwitch: boolean;
  alreadyRan: boolean;
  runsLastHour: number;
  dryRun: boolean;
  approved: boolean;
}): RunDecision {
  if (!input.engineEnabled) return { kind: "skip", reason: "engine_disabled" };
  if (input.killSwitch) return { kind: "skip", reason: "kill_switch" };
  if (validateWorkflowDefinition(input.def).length) return { kind: "skip", reason: "invalid_definition" };
  if (input.alreadyRan) return { kind: "skip", reason: "duplicate" };
  if (input.runsLastHour >= input.def.rateLimit.perHour) return { kind: "skip", reason: "rate_limited" };
  if (!evaluateConditions(input.def.conditions, input.facts)) return { kind: "skip", reason: "conditions_not_met" };
  const actions = input.def.actions.map((a) => a.type);
  if (input.dryRun) return { kind: "dry_run", actions };
  if (actions.some((a) => APPROVAL_REQUIRED_ACTIONS.includes(a)) && !input.approved) return { kind: "needs_approval", actions };
  return { kind: "execute", actions };
}

export type AttemptOutcome = { ok: boolean; timedOut?: boolean };

/** After a failed attempt: retry with backoff, or dead-letter once attempts are exhausted. */
export function nextAfterFailure(attempt: number, def: WorkflowDefinition): { kind: "retry"; delayMs: number } | { kind: "dead_letter" } {
  return attempt >= def.retry.maxAttempts ? { kind: "dead_letter" } : { kind: "retry", delayMs: retryDelayMs(attempt, def.retry.baseDelayMs) };
}

/** Runs actions through an injected runner with retries; never throws, always returns a verdict. */
export async function runWorkflow(
  def: WorkflowDefinition,
  runner: (action: WorkflowAction, attempt: number) => Promise<AttemptOutcome>,
  sleep: (ms: number) => Promise<void> = async () => {},
): Promise<{ status: "succeeded" | "dead_letter"; attempts: number; failedAction?: AutomationActionType }> {
  let attempts = 0;
  for (const action of def.actions) {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      attempts += 1;
      let outcome: AttemptOutcome;
      try {
        outcome = await runner(action, attempt);
      } catch {
        outcome = { ok: false };
      }
      if (outcome.ok) break;
      const next = nextAfterFailure(attempt, def);
      if (next.kind === "dead_letter") return { status: "dead_letter", attempts, failedAction: action.type };
      await sleep(next.delayMs);
    }
  }
  return { status: "succeeded", attempts };
}
