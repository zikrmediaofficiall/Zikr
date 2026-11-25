// OMNIS P14-02: load and recovery behaviour of the pure cores, no live environment needed.
import assert from "node:assert/strict";
import { decideRun, idempotencyKey, runWorkflow, type WorkflowDefinition } from "../../src/features/automation/workflow-engine";
import { applyBudgets, createBudgetTracker } from "../../src/features/spiritual-ai/services/provider-budget";
import { analyzeDump } from "../lib/restore-drill.mjs";

const def: WorkflowDefinition = { key: "load-test", trigger: { type: "event", name: "x" }, conditions: [], actions: [{ type: "notify_admin" }, { type: "revalidate_path" }], verification: { expect: "ok" }, retry: { maxAttempts: 3, baseDelayMs: 100 }, timeoutMs: 1000, rateLimit: { perHour: 50 } };
const base = { def, facts: {}, engineEnabled: true, killSwitch: false, dryRun: false, approved: false };

// Burst: 10,000 trigger evaluations in one hour. Rate limit admits exactly perHour, the rest are skipped.
let admitted = 0;
const seen = new Set<string>();
const started = Date.now();
for (let i = 0; i < 10_000; i += 1) {
  const key = idempotencyKey(def.key, `evt-${i % 200}`, 60_000, 1_000_000);
  const decision = decideRun({ ...base, alreadyRan: seen.has(key), runsLastHour: admitted });
  if (decision.kind === "execute") { admitted += 1; seen.add(key); }
}
assert.equal(admitted, 50, "rate limit caps a burst");
assert.ok(Date.now() - started < 2000, "10k decisions stay fast");

// Duplicate events inside one bucket never run twice.
assert.equal(decideRun({ ...base, alreadyRan: true, runsLastHour: 0 }).kind, "skip");

// Recovery: a flaky action succeeds after retries; a dead one is dead-lettered with the failing action named.
let calls = 0;
const flaky = await runWorkflow(def, async () => ({ ok: ++calls % 3 === 0 }), async () => {});
assert.equal(flaky.status, "succeeded");
const dead = await runWorkflow(def, async (a) => ({ ok: a.type !== "revalidate_path" }), async () => {});
assert.equal(dead.status, "dead_letter");
assert.equal(dead.failedAction, "revalidate_path");
const thrown = await runWorkflow(def, async () => { throw new Error("boom"); }, async () => {});
assert.equal(thrown.status, "dead_letter", "a throwing runner never escapes");

// Kill switch beats everything, including an approved run.
assert.equal(decideRun({ ...base, killSwitch: true, alreadyRan: false, runsLastHour: 0, approved: true }).kind, "skip");

// Budgets under load: after the cap, every further call is refused without calling the provider.
const tracker = createBudgetTracker(() => new Date("2026-11-25T00:00:00Z"));
const config = { m: { dailyRequests: 100 } };
let calledProvider = 0;
for (let i = 0; i < 1000; i += 1) {
  if (applyBudgets(["m"], config, tracker).length) { calledProvider += 1; tracker.record("m"); }
}
assert.equal(calledProvider, 100);

// Recovery drill analyzer handles a large dump and flags a truncated one.
const rows = Array.from({ length: 50_000 }, (_, i) => String(i)).join("\n");
const dump = `-- PostgreSQL database dump\nCREATE TABLE public.t (id int);\nCOPY public.t (id) FROM stdin;\n${rows}\n\\.\n-- PostgreSQL database dump complete\n`;
assert.equal(analyzeDump(dump, ["t"]).rowsByTable.t, 50_000);
assert.equal(analyzeDump(dump.slice(0, dump.length - 40), ["t"]).ok, false);

console.log("omnis-load-recovery tests passed");
