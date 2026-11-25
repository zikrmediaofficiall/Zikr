import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decideRun, evaluateConditions, idempotencyKey, isAutomationEngineEnabled, nextAfterFailure,
  retryDelayMs, runWorkflow, validateWorkflowDefinition, type WorkflowDefinition,
} from "../../src/features/automation/workflow-engine";

const def: WorkflowDefinition = {
  key: "queue-stuck-alert",
  trigger: { type: "schedule", name: "every-15-min" },
  conditions: [{ field: "queued", op: "gt", value: 10 }],
  actions: [{ type: "notify_admin" }],
  verification: { expect: "audit event recorded" },
  retry: { maxAttempts: 3, baseDelayMs: 100 },
  timeoutMs: 5000,
  rateLimit: { perHour: 4 },
};
const base = { def, facts: { queued: 20 }, engineEnabled: true, killSwitch: false, alreadyRan: false, runsLastHour: 0, dryRun: false, approved: false };

assert.deepEqual(validateWorkflowDefinition(def), []);
assert.ok(validateWorkflowDefinition({ ...def, key: "X" }).length);
assert.ok(validateWorkflowDefinition({ ...def, actions: [] }).length);
assert.ok(validateWorkflowDefinition({ ...def, verification: null }).length, "verification is mandatory");
assert.ok(validateWorkflowDefinition({ ...def, retry: { maxAttempts: 9, baseDelayMs: 100 } }).length);

assert.equal(isAutomationEngineEnabled({}), false, "engine is off by default");
assert.equal(isAutomationEngineEnabled({ AUTOMATION_ENGINE_ENABLED: "true" }), true);
assert.equal(evaluateConditions(def.conditions, { queued: 5 }), false);
assert.equal(evaluateConditions(def.conditions, {}), false, "missing facts never satisfy a condition");

assert.deepEqual(decideRun({ ...base, engineEnabled: false }), { kind: "skip", reason: "engine_disabled" });
assert.deepEqual(decideRun({ ...base, killSwitch: true }), { kind: "skip", reason: "kill_switch" });
assert.deepEqual(decideRun({ ...base, alreadyRan: true }), { kind: "skip", reason: "duplicate" });
assert.deepEqual(decideRun({ ...base, runsLastHour: 4 }), { kind: "skip", reason: "rate_limited" });
assert.deepEqual(decideRun({ ...base, facts: { queued: 1 } }), { kind: "skip", reason: "conditions_not_met" });
assert.equal(decideRun({ ...base, dryRun: true }).kind, "dry_run");
assert.equal(decideRun(base).kind, "execute");
const risky = { ...def, actions: [{ type: "pause_queue" as const }] };
assert.equal(decideRun({ ...base, def: risky }).kind, "needs_approval", "state-changing actions need approval");
assert.equal(decideRun({ ...base, def: risky, approved: true }).kind, "execute");
assert.equal(decideRun({ ...base, def: risky, dryRun: true }).kind, "dry_run", "dry run never needs approval");

const k = idempotencyKey("w", "evt-1", 60000, 960_000);
assert.equal(k, idempotencyKey("w", "evt-1", 60000, 1_000_000), "same bucket, same key");
assert.notEqual(k, idempotencyKey("w", "evt-1", 60000, 1_100_000));
assert.equal(retryDelayMs(1, 100), 100);
assert.equal(retryDelayMs(3, 100), 400);
assert.equal(retryDelayMs(30, 100), 900000, "backoff is capped");
assert.deepEqual(nextAfterFailure(3, def), { kind: "dead_letter" });

let calls = 0;
const slept: number[] = [];
const ok = await runWorkflow(def, async () => ({ ok: ++calls >= 3 }), async (ms) => { slept.push(ms); });
assert.deepEqual([ok.status, ok.attempts, slept], ["succeeded", 3, [100, 200]]);
const dead = await runWorkflow(def, async () => { throw new Error("boom"); });
assert.deepEqual([dead.status, dead.attempts, dead.failedAction], ["dead_letter", 3, "notify_admin"]);

const sql = readFileSync("supabase/migrations/20261125180000_omnis_automation_engine.sql", "utf8");
for (const t of ["automation_workflows", "automation_runs", "automation_dead_letters"]) {
  assert.ok(sql.includes(`alter table public.${t} enable row level security`), `${t} must enable RLS`);
}
assert.equal(/create policy/i.test(sql), false, "no anon/authenticated policies: service role only");
console.log("Automation engine contracts passed.");
