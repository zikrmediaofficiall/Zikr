import assert from "node:assert/strict";
import test from "node:test";
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
