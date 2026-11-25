import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANALYTICS_ROW_LIMITS, isTruncated, partialSources } from "../../src/features/admin/services/analytics-completeness";

assert.equal(isTruncated(499, 500), false);
assert.equal(isTruncated(500, 500), true);
const none = { ok: true, count: 10 };
assert.deepEqual(partialSources({ pageViews: none, auditEvents: none, videoRequests: none }), []);
assert.deepEqual(
  partialSources({ pageViews: { ok: true, count: ANALYTICS_ROW_LIMITS.pageViews }, auditEvents: none, videoRequests: { ok: true, count: 1000 } }),
  ["زيارات لوحة التحكم", "أداء القوالب البصرية"],
);
assert.deepEqual(
  partialSources({ pageViews: { ok: false, count: 500 }, auditEvents: none, videoRequests: none }),
  [],
  "failed sources are reported as unavailable, not partial",
);
const svc = readFileSync("src/features/admin/services/analytics.ts", "utf8");
for (const [name, limit] of [["admin_page_views", 500], ["admin_audit_events", 500], ["video_generation_requests", 1000]] as const) {
  const re = new RegExp(`${name}[^\`]*?limit=${limit}`, "s");
  assert.ok(re.test(svc), `${name} query limit must match ANALYTICS_ROW_LIMITS (${limit})`);
}
assert.ok(svc.includes("partialSources(") && svc.includes("generatedAt"));
console.log("Admin analytics completeness contracts passed.");
