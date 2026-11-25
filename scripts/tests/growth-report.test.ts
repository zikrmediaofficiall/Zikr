import assert from "node:assert/strict";
import { latestSnapshots, revenueReport, suppressSmallCohorts, totalsByPlatform, weekStart, weeklyTrend } from "../../src/features/admin/omnis/growth-report";

const rows = [
  { queue_id: "a", platform: "youtube", metrics: { views: 10, likes: 1 }, captured_at: "2026-11-02T10:00:00Z" },
  { queue_id: "a", platform: "youtube", metrics: { views: 50, likes: 5, comments: 2 }, captured_at: "2026-11-09T10:00:00Z" },
  { queue_id: "b", platform: "facebook", metrics: { views: 7 }, captured_at: "2026-11-10T10:00:00Z" },
  { queue_id: "c", platform: "youtube", metrics: { views: "bad", likes: -3 }, captured_at: "2026-11-10T11:00:00Z" },
];
assert.equal(latestSnapshots(rows).length, 3, "newest snapshot per post/platform");
const totals = totalsByPlatform(rows);
assert.deepEqual(totals[0], { platform: "youtube", posts: 2, views: 50, likes: 5, comments: 2 }, "no double counting, bad values ignored");
assert.equal(weekStart("2026-11-25T12:00:00Z"), "2026-11-23");
assert.deepEqual(weeklyTrend(rows).map((p) => p.week), ["2026-11-09"]);
assert.deepEqual(suppressSmallCohorts({ android: 3, web: 25 }), { android: null, web: 25 });
assert.deepEqual(revenueReport(null).actual, null);
assert.equal(revenueReport({ actual: 5 }).estimated, null);
console.log("growth-report tests passed");
import { manualRevenueTotals, parseManualRevenue } from "../../src/features/admin/omnis/growth-report";
const manual = parseManualRevenue({ months: { "2026-10": { actual: 12.5, currency: "USD" }, "2026-11": { actual: 5, estimated: 7.255, currency: "EUR" }, "bad": { actual: 1 }, "2026-12": { actual: -4 }, "2026-09": { actual: "x" } } });
assert.deepEqual(manual.map((m) => m.month), ["2026-11", "2026-10"]);
assert.deepEqual(manualRevenueTotals(manual), { EUR: { actual: 5, estimated: 7.26 }, USD: { actual: 12.5, estimated: 0 } });
console.log("manual revenue tests passed");
