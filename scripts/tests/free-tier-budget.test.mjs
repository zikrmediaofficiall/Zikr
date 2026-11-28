import assert from "node:assert/strict";
import test from "node:test";

import {
  assertWithinBudget,
  buildReport,
  computeStatus,
  effectiveLimit,
  loadRegistry,
  renderMarkdown,
  renderTable,
  validateRegistry,
  worstState,
} from "../free-tier-budget.mjs";

test("the committed registry is valid and every service names its source", () => {
  const registry = loadRegistry();
  assert.ok(registry.services.length >= 20, "the registry should cover every free plan the project uses");
  for (const service of registry.services) {
    assert.match(service.source, /^https?:\/\//, `${service.id} must cite a source URL`);
  }
});

test("a duplicate service id is rejected", () => {
  const registry = loadRegistry();
  const duplicated = { ...registry, services: [registry.services[0], registry.services[0]] };
  assert.throws(() => validateRegistry(duplicated), /duplicate service id/);
});

test("a self cap above the vendor limit is rejected", () => {
  const registry = loadRegistry();
  const broken = {
    ...registry,
    services: [{ ...registry.services[0], limit: 100, selfCap: 150 }],
  };
  assert.throws(() => validateRegistry(broken), /exceeds the vendor limit/);
});

test("status crosses 80 percent into warn and 100 percent into critical", () => {
  assert.equal(computeStatus({ limit: 100, used: 79 }).state, "ok");
  assert.equal(computeStatus({ limit: 100, used: 80 }).state, "warn");
  assert.equal(computeStatus({ limit: 100, used: 99.9 }).state, "warn");
  assert.equal(computeStatus({ limit: 100, used: 100 }).state, "critical");
  assert.equal(computeStatus({ limit: 100, used: 140 }).state, "critical");
});

test("missing usage is unknown, never zero", () => {
  const status = computeStatus({ limit: 500, used: null });
  assert.equal(status.state, "unknown");
  assert.equal(status.percent, null);
  assert.equal(status.remaining, null);
});

test("a zero limit is a guard: any usage is critical", () => {
  assert.equal(computeStatus({ limit: 0, used: 0 }).state, "ok");
  assert.equal(computeStatus({ limit: 0, used: 1 }).state, "critical");
});

test("our own cap is the limit a pipeline respects", () => {
  const registry = loadRegistry();
  const flow = registry.services.find((service) => service.id === "flow-credits");
  assert.equal(flow.limit, 50);
  assert.equal(flow.selfCap, 40);
  assert.equal(effectiveLimit(flow), 40);
});

test("a report over the cap is critical and names the fallback", () => {
  const registry = loadRegistry();
  const report = buildReport(registry, {
    recordedAt: "2026-11-28T07:00:00+02:00",
    services: { "flow-credits": { used: 40 } },
  });
  const row = report.rows.find((item) => item.id === "flow-credits");
  assert.equal(row.state, "critical");
  assert.match(row.fallback, /upscale/i);
  assert.equal(worstState(report), "critical");
});

test("assertWithinBudget throws at the limit and warns above the threshold", () => {
  const registry = loadRegistry();
  const atLimit = buildReport(registry, { services: { "hf-zerogpu-runs": { used: 6 } } });
  assert.throws(() => assertWithinBudget(atLimit, "hf-zerogpu-runs"), /at its limit/);

  const nearLimit = buildReport(registry, { services: { "hf-zerogpu-runs": { used: 5 } } });
  const warning = assertWithinBudget(nearLimit, "hf-zerogpu-runs");
  assert.match(warning, /83%/);

  const comfortable = buildReport(registry, { services: { "hf-zerogpu-runs": { used: 1 } } });
  assert.equal(assertWithinBudget(comfortable, "hf-zerogpu-runs"), null);
});

test("assertWithinBudget refuses an unknown service instead of passing silently", () => {
  const report = buildReport(loadRegistry(), { services: {} });
  assert.throws(() => assertWithinBudget(report, "not-a-service"), /unknown service/);
});

test("markdown and table renders carry the state and the limit for every row", () => {
  const report = buildReport(loadRegistry(), { services: { "supabase-database": { used: 250 } } });
  const markdown = renderMarkdown(report);
  const table = renderTable(report);
  assert.match(markdown, /\| Service \| Plan \| Used \| Limit \| Used % \| State \| Fallback \|/);
  assert.match(markdown, /Supabase database size/);
  assert.match(table, /supabase-database/);
  assert.equal(markdown.split("\n").length >= report.rows.length, true);
});
