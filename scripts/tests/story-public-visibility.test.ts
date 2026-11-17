import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isPublicStoryRecord } from "../../src/features/stories/services/story-public-visibility";

test("public story records require published, approved, and global ownership state", () => {
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: null }), true);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: false, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: "70000000-0000-4000-8000-000000000001" }), false);
  assert.equal(isPublicStoryRecord({ published: false, is_approved: true, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, user_id: null }), false);
  assert.equal(isPublicStoryRecord({ published: true, is_approved: true }), false);
});

test("public story service selects and validates approval and ownership fields", () => {
  const service = readFileSync("src/features/stories/services/stories.ts", "utf8");
  assert.match(service, /isPublicStoryRecord\(row\)/);
  assert.match(service, /is_approved=eq\.true&user_id=is\.null/);
  assert.match(
    service,
    /select=id,slug,title,summary,content,category,mood,metadata,published,is_approved,user_id,created_at,updated_at/,
  );
});

test("offline story snapshots exclude user-owned rows", () => {
  const exporter = readFileSync("scripts/export-offline-content.mjs", "utf8");
  const storiesDefinition = exporter.split(/\r?\n/).find((line) => line.trim().startsWith("['stories',"));

  assert.ok(storiesDefinition, "offline exporter must define the Stories dataset");
  assert.match(storiesDefinition, /'published=eq\.true'/);
  assert.match(storiesDefinition, /'is_approved=eq\.true'/);
  assert.match(storiesDefinition, /'user_id=is\.null'/);
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
