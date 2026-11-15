import assert from "node:assert/strict";
import {
  ADMIN_DASHBOARD_COUNT_PERMISSIONS,
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
