import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ADMIN_SEARCH_ACCESS_PERMISSIONS, getAdminSearchResultHref, getVisibleAdminSearchSourceKeys } from "../../src/features/admin/services/admin-search-visibility";
import { hasAdminPermission, type AdminRole } from "../../src/features/admin/services/permissions";

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


test("admin search route admits roles that can access at least one source", () => {
  const roles: AdminRole[] = [
    "user",
    "admin",
    "super_admin",
    "content_manager",
    "editor",
    "video_manager",
    "social_manager",
    "moderator",
    "seo_manager",
    "analyst",
    "support",
  ];
  for (const role of roles) {
    const canSeeSource = getVisibleAdminSearchSourceKeys(role).length > 0;
    const canEnterSearch = ADMIN_SEARCH_ACCESS_PERMISSIONS.some((permission) =>
      hasAdminPermission(role, permission),
    );
    assert.equal(canEnterSearch, canSeeSource, `route access and source visibility must agree for ${role}`);
  }

  const pageSource = readFileSync("src/app/admin/search/page.tsx", "utf8");
  const adminSource = readFileSync("src/features/admin/services/admin.ts", "utf8");
  const verifierSource = readFileSync("scripts/verify-admin-pages.mjs", "utf8");
  const governanceVerifierSource = readFileSync("scripts/verify-admin-governance.mjs", "utf8");
  assert.match(pageSource, /requireAnyAdminPermission\(ADMIN_SEARCH_ACCESS_PERMISSIONS\)/);
  assert.match(adminSource, /permissions\.some\(\(permission\) => hasAdminPermission\(profile\.role, permission\)\)/);
  assert.ok(verifierSource.includes("/requireAnyAdminPermission\\(/"), "the canonical admin page verifier must recognize the any-permission guard");
  assert.ok(governanceVerifierSource.includes("requireAnyAdminPermission\\("), "the admin governance verifier must recognize the any-permission guard");
});


test("admin search keeps drafts and audience-restricted videos inside admin routes", () => {
  assert.equal(
    getAdminSearchResultHref({ type: "مقال", slug: "draft-article", published: false }),
    "/admin/content",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "مقال", slug: "published-article", published: true }),
    "/articles/published-article",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "قصة", slug: "draft-story", published: false }),
    "/admin/content",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "قصة", slug: "published-story", published: true }),
    "/stories/published-story",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "فيديو", slug: "kids-video", published: true }),
    "/admin/video",
    "Kids-only and unpublished videos must not be linked to public video routes",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "حديث", slug: null, published: true }),
    "/admin/knowledge",
  );
  assert.equal(
    getAdminSearchResultHref({ type: "مكتبة", slug: null, published: false }),
    "/admin/content",
  );
});
