import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADMIN_DASHBOARD_COUNT_PERMISSIONS,
  buildAdminQueueOverview,
  getVisibleAdminDashboardCountSections,
} from "../../src/features/admin/services/admin-dashboard-visibility";

const sections = [
  { key: "content", title: "Content", description: "", tables: ["articles", "content_library", "hadiths"] },
  { key: "kids", title: "Kids", description: "", tables: ["kids_content"] },
  { key: "operations", title: "Operations", description: "", tables: ["profiles", "videos", "media_assets", "video_generation_requests", "admin_audit_events", "unknown_private_table"] },
] as const;

const counts = [
  "articles",
  "content_library",
  "hadiths",
  "kids_content",
  "profiles",
  "videos",
  "media_assets",
  "video_generation_requests",
  "admin_audit_events",
  "unknown_private_table",
].map((table) => ({ table, label: table, count: 1 }));

const visibleTables = (role: Parameters<typeof getVisibleAdminDashboardCountSections>[0]) =>
  getVisibleAdminDashboardCountSections(role, sections, counts)
    .flatMap((section) => section.values.map((value) => value.table));

assert.deepEqual(visibleTables("support"), ["profiles"]);
assert.deepEqual(visibleTables("analyst"), ["admin_audit_events"]);
assert.deepEqual(visibleTables("video_manager"), [
  "videos",
  "media_assets",
  "video_generation_requests",
  "admin_audit_events",
]);
assert.deepEqual(visibleTables("moderator"), [
  "articles",
  "content_library",
  "kids_content",
  "admin_audit_events",
]);
assert.deepEqual(visibleTables("social_manager"), ["media_assets", "admin_audit_events"]);
assert.deepEqual(visibleTables("admin"), [
  "articles",
  "content_library",
  "hadiths",
  "kids_content",
  "profiles",
  "videos",
  "media_assets",
  "video_generation_requests",
  "admin_audit_events",
]);
assert.equal(
  Object.prototype.hasOwnProperty.call(ADMIN_DASHBOARD_COUNT_PERMISSIONS, "unknown_private_table"),
  false,
  "unknown dashboard count tables must fail closed",
);

console.log("Admin dashboard inventory visibility passed: delegated roles only receive counts for explicitly permitted tables.");

const videoCounts = {
  counts: { pending: 2, processing: 1, retry_wait: 3, failed: 4 },
  available: true,
};
const socialCounts = {
  counts: { queued: 5, processing: 2, partial: 1, failed: 3 },
  available: true,
};
const generatedAt = "2026-11-15T18:10:00.000Z";
const supportOverview = buildAdminQueueOverview("support", videoCounts, socialCounts, generatedAt);
assert.deepEqual(supportOverview.videoGeneration, {});
assert.deepEqual(supportOverview.socialQueue, {});
assert.deepEqual(supportOverview.unavailable, ["video_generation_requests", "social_publish_queue"]);
assert.equal("counts" in supportOverview, false, "the live overview must not serialize unrelated table totals");
assert.equal("sections" in supportOverview, false, "the live overview must not serialize site section settings");

const videoManagerOverview = buildAdminQueueOverview("video_manager", videoCounts, socialCounts, generatedAt);
assert.deepEqual(videoManagerOverview.videoGeneration, videoCounts.counts);
assert.deepEqual(videoManagerOverview.socialQueue, {});
assert.deepEqual(videoManagerOverview.unavailable, ["social_publish_queue"]);

const socialManagerOverview = buildAdminQueueOverview("social_manager", videoCounts, socialCounts, generatedAt);
assert.deepEqual(socialManagerOverview.videoGeneration, {});
assert.deepEqual(socialManagerOverview.socialQueue, socialCounts.counts);
assert.deepEqual(socialManagerOverview.unavailable, ["video_generation_requests"]);

const adminOverview = buildAdminQueueOverview("admin", videoCounts, socialCounts, generatedAt);
assert.deepEqual(adminOverview.videoGeneration, videoCounts.counts);
assert.deepEqual(adminOverview.socialQueue, socialCounts.counts);
assert.deepEqual(adminOverview.unavailable, []);

const unavailableOverview = buildAdminQueueOverview(
  "admin",
  { counts: { pending: 0 }, available: false },
  socialCounts,
  generatedAt,
);
assert.deepEqual(unavailableOverview.videoGeneration, {}, "failed queue reads must not be rendered as real zero counts");
assert.deepEqual(unavailableOverview.socialQueue, socialCounts.counts);
assert.deepEqual(unavailableOverview.unavailable, ["video_generation_requests"]);

const overviewRoute = readFileSync("src/app/api/admin/overview/route.ts", "utf8");
const platformService = readFileSync("src/features/admin/services/platform.ts", "utf8");
assert.ok(overviewRoute.includes("getAdminOverview(auth.profile.role)"), "the API must pass the authenticated delegated role to the overview service");
assert.ok(platformService.includes('getExactStatusCounts("social_publish_queue", ["queued", "processing", "partial", "failed"])'),
  "the live social queue card must receive authoritative social queue counts");
assert.ok(!platformService.includes("const OVERVIEW_TABLES = ["),
  "the live overview API must not return broad cross-domain table counts");

