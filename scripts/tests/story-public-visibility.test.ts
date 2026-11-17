import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  filterPublicStoryRecords,
  isPublicStoryRecord,
} from "../../src/features/stories/services/story-public-visibility";

test("public story records require published, approved, and global ownership state", () => {
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: null }), true);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: false, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: "70000000-0000-4000-8000-000000000001" }), false);
  assert.equal(isPublicStoryRecord({ published: false, is_approved: true, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true }), false);
});

test("successful empty and mixed story reads never resurrect non-public fallback rows", () => {
  const publicStory = {
    id: "public-1",
    slug: "public-story",
    title: "Public story",
    category: "history",
    published: true,
    is_approved: true,
    user_id: null,
  };
  const unapprovedStory = {
    ...publicStory,
    id: "unapproved-1",
    slug: "unapproved-story",
    is_approved: false,
  };
  const userOwnedStory = {
    ...publicStory,
    id: "owned-1",
    slug: "owned-story",
    user_id: "70000000-0000-4000-8000-000000000001",
  };

  assert.deepEqual(
    filterPublicStoryRecords<typeof publicStory>([publicStory, unapprovedStory, userOwnedStory]),
    [publicStory],
    "only explicitly public rows may reach the story mapper",
  );
  assert.deepEqual(
    filterPublicStoryRecords<typeof publicStory>([]),
    [],
    "a successful empty database response must remain empty instead of using static fallback stories",
  );
  assert.equal(
    filterPublicStoryRecords<typeof publicStory>(null),
    null,
    "an invalid response remains distinguishable from a successful empty response",
  );
});

test("public story service filters database rows and only uses fallback for unavailable reads", () => {
  const service = readFileSync(
    "src/features/stories/services/stories.ts",
    "utf8",
  );
  assert.match(service, /isPublicStoryRecord\(row\)/);
  assert.match(service, /is_approved=eq\.true&user_id=is\.null/);
  assert.match(
    service,
    /filterPublicStoryRecords<StoryRow>\(response\)/,
    "the service must filter the database response through the public visibility contract",
  );
  assert.match(
    service,
    /const mapped = publicRows\.filter\(isStoryRow\)\.map\(mapStoryRow\)/,
    "the service must map only structurally valid public rows",
  );
  assert.doesNotMatch(
    service,
    /response\.length === 0/,
    "a successful empty result must not be treated as a reason to serve stale static stories",
  );
  assert.doesNotMatch(
    service,
    /!response\.every\(isStoryRow\)/,
    "one non-public row must be filtered, not turn the whole response into a fallback",
  );
});

test("story RLS migration mirrors the public service and retains admin access", () => {
  const migration = readFileSync(
    "supabase/migrations/20261117010000_stories_public_rls_requires_approved_global_rows.sql",
    "utf8",
  );
  assert.match(migration, /published IS TRUE\s+AND is_approved IS TRUE\s+AND user_id IS NULL/);
  assert.match(migration, /private\.is_admin_user\(\)/);
  assert.doesNotMatch(migration, /\b(DELETE FROM|UPDATE public\.stories)\b/i);
});

console.log("STORIES_PUBLIC_RLS_TEST_PASSED");
