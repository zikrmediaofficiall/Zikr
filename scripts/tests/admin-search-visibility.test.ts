import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getVisibleAdminSearchSourceKeys } from "../../src/features/admin/services/admin-search-visibility";

test("admin search only queries sources covered by the effective role", () => {
  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("seo_manager"),
    ["articles", "stories"],
    "SEO managers have content.manage but not knowledge, library or video permissions",
  );

  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("moderator"),
    ["articles", "stories", "content_library"],
    "moderators have content and library access but no knowledge/video access",
  );

  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("content_manager"),
    ["articles", "stories", "hadiths", "duas", "content_library"],
    "content managers do not receive video search results without video.manage",
  );

  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("editor"),
    ["articles", "stories", "hadiths", "duas", "content_library"],
  );

  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("video_manager"),
    ["videos"],
  );

  assert.deepEqual(
    getVisibleAdminSearchSourceKeys("admin"),
    ["articles", "stories", "videos", "hadiths", "duas", "content_library"],
  );

  assert.deepEqual(getVisibleAdminSearchSourceKeys("support"), []);
});

test("admin search applies the effective role before issuing service-role reads", () => {
  const platformSource = readFileSync(
    "src/features/admin/services/platform.ts",
    "utf8",
  );
  const pageSource = readFileSync("src/app/admin/search/page.tsx", "utf8");

  assert.match(platformSource, /searchAdminContent\(query: string, role: AdminRole\)/);
  assert.match(platformSource, /getVisibleAdminSearchSourceKeys\(role\)\.map/);
  assert.match(pageSource, /searchAdminContent\(query, profile\.role\)/);
});
