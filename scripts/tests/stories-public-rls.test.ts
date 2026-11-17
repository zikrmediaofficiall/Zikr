import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261117020000_harden_public_stories_read_policy.sql",
  "utf8",
);
assert.match(
  migration,
  /CREATE POLICY stories_public_read_published[\s\S]*?TO anon[\s\S]*?published IS TRUE[\s\S]*?is_approved IS TRUE[\s\S]*?user_id IS NULL/i,
  "anonymous story reads must be limited to published, approved, non-user-owned stories",
);
assert.match(
  migration,
  /CREATE POLICY stories_authenticated_read_published_or_admin[\s\S]*?published IS TRUE[\s\S]*?is_approved IS TRUE[\s\S]*?user_id IS NULL[\s\S]*?private\.is_admin_user\(\)/i,
  "authenticated non-admin reads must match the public approved-story contract while admins retain access",
);

const storiesService = readFileSync(
  "src/features/stories/services/stories.ts",
  "utf8",
);
assert.match(
  storiesService,
  /published=eq\.true&is_approved=eq\.true&user_id=is\.null/,
  "the public Stories service must keep the approved, non-user-owned filters",
);

const offlineExporter = readFileSync("scripts/export-offline-content.mjs", "utf8");
assert.match(
  offlineExporter,
  /\['stories', 'stories',[^\n]*'published=eq\.true',[^\n]*'is_approved=eq\.true',[^\n]*'user_id=is\.null'/,
  "the public offline snapshot must exclude user-owned stories",
);

const migrationValidator = readFileSync("scripts/validate-migrations.mjs", "utf8");
assert.ok(
  migrationValidator.includes("STORIES_PUBLIC_RLS_POLICY_PASSED"),
  "canonical migration replay must verify the Stories RLS contract",
);

console.log("STORIES_PUBLIC_RLS_TEST_PASSED");
