import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261116195000_video_like_counts_public_visibility.sql",
  "utf8",
);
const route = readFileSync("src/app/api/videos/[videoId]/like/route.ts", "utf8");
const originalSummaryMigration = readFileSync(
  "supabase/migrations/20261106214309_secure_video_like_count_summary.sql",
  "utf8",
);

assert.match(migration, /drop policy if exists "Public can read video like totals"/i);
assert.match(
  migration,
  /using\s*\(\s*exists\s*\([\s\S]*from public\.videos as visible_video[\s\S]*where visible_video\.id = video_like_counts\.video_id[\s\S]*\)\s*\)/i,
  "public aggregate rows must be limited by the videos table's own RLS visibility policy",
);
assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
assert.match(originalSummaryMigration, /alter table public\.video_like_counts enable row level security/i);
assert.match(originalSummaryMigration, /grant select on table public\.video_like_counts to anon, authenticated/i);

assert.match(route, /\.eq\("user_id", viewerId\)/);
assert.match(route, /likeStatus\(supabase, videoId, user\?\.id \?\? null\)/);
assert.equal((route.match(/likeStatus\(supabase, videoId, user\.id\)/g) ?? []).length, 2);
assert.match(route, /authenticated: Boolean\(viewerId\)/);

const insertPolicyStart = migration.indexOf(
  'CREATE POLICY "Users can like videos as themselves"',
);
const insertPolicyCheck = migration.indexOf("WITH CHECK", insertPolicyStart);
const visibleVideoCheck = migration.indexOf(
  "FROM public.videos AS visible_video",
  insertPolicyCheck,
);
const visibleVideoMatch = migration.indexOf(
  "WHERE visible_video.id = video_likes.video_id",
  visibleVideoCheck,
);
assert.ok(insertPolicyStart >= 0 && insertPolicyCheck > insertPolicyStart);
assert.ok(
  visibleVideoCheck > insertPolicyCheck && visibleVideoMatch > visibleVideoCheck,
  "direct authenticated inserts must be limited to videos visible through videos RLS",
);
const workflow = readFileSync(".github/workflows/quality-gate.yml", "utf8");
assert.ok(
  workflow.includes("scripts/tests/video-like-count-visibility.integration.sh"),
  "the PostgreSQL 17 read/write visibility regression must run in the canonical Quality Gate",
);

console.log("Video like read/write visibility and viewer identity contracts passed.");
