import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldSuppressOfflineFallback } from "../../src/lib/data/publication-visibility-contract";
import { isPublicStoryRecord } from "../../src/features/stories/services/story-public-visibility";

assert.equal(shouldSuppressOfflineFallback("unpublished"), true);
assert.equal(shouldSuppressOfflineFallback("unknown"), true);
assert.equal(shouldSuppressOfflineFallback("published"), false);
assert.equal(shouldSuppressOfflineFallback("missing"), false);

assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: null }), true);
assert.equal(isPublicStoryRecord({ published: true, is_approved: false, user_id: null }), false);
assert.equal(isPublicStoryRecord({ published: true, is_approved: true, user_id: "70000000-0000-4000-8000-000000000001" }), false);
assert.equal(isPublicStoryRecord({ published: false, is_approved: true, user_id: null }), false);
assert.equal(isPublicStoryRecord({ published: true, user_id: null }), false, "missing approval must fail closed");
assert.equal(isPublicStoryRecord({ published: true, is_approved: true }), false, "missing ownership state must fail closed");

const helper = readFileSync("src/lib/data/publication-visibility.ts", "utf8");
assert.match(helper, /supabaseServerAdminRequest/);
assert.match(helper, /select=published&slug=eq/);
assert.match(helper, /cache: "no-store"/);
assert.match(helper, /return "unknown"/);
assert.match(helper, /CACHE_TTL_MS/);
assert.match(helper, /UNKNOWN_CACHE_TTL_MS/);
assert.match(helper, /inFlightLookups/);

const serviceContracts = [
  ["src/features/articles/services/articles.ts", '"articles", safeSlug'],
  ["src/features/dua/services/dua.ts", '"duas", cleanSlug'],
  ["src/features/prophets/services/prophets.ts", '"prophets", cleanSlug'],
] as const;

const articleService = readFileSync("src/features/articles/services/articles.ts", "utf8");
assert.match(articleService, /revalidate: 60, tags: \["public-articles"\]/, "article list and detail caches must have a short, invalidatable publication tag");
assert.match(articleService, /if \(rows\.length === 0\)/, "a successful empty published query must not reuse a stale database snapshot");
const contentActions = readFileSync("src/app/admin/content-actions.ts", "utf8");
assert.match(contentActions, /updateTag\("public-articles"\)/, "admin publish and delete server actions must immediately invalidate public article caches");
assert.match(articleService, /if \(hasOfflineFallback\)/, "article visibility checks must run only when an offline fallback would otherwise render");
const duaService = readFileSync("src/features/dua/services/dua.ts", "utf8");
assert.match(duaService, /databaseLookupFailed \? fallbackBase : FALLBACK_DUAS/, "successful empty dua queries must not reuse an old offline DB snapshot");
assert.match(duaService, /!databaseLookupFailed && localMatch/, "dua visibility checks must not run for arbitrary unknown slugs");
const prophetService = readFileSync("src/features/prophets/services/prophets.ts", "utf8");
assert.match(prophetService, /database !== null/, "successful empty prophet queries must be distinguished from failed queries");
assert.match(prophetService, /!databaseLookupFailed && hasLocalFallback/, "prophet visibility checks must be limited to known fallback slugs");

for (const [path, lookup] of serviceContracts) {
  const source = readFileSync(path, "utf8");
  assert.ok(source.includes(`getDatabasePublicationState(${lookup})`), `${path} must verify explicit database publication state before offline fallback`);
  assert.match(source, /shouldSuppressOfflineFallback\(publicationState\)/, `${path} must suppress fallback for unpublished or unverifiable records`);
}

console.log("Public detail-route publication visibility contracts passed.");
const storiesService = readFileSync("src/features/stories/services/stories.ts", "utf8");
assert.match(storiesService, /isPublicStoryRecord\(row\)/, "public story responses must recheck approval and ownership");
assert.match(storiesService, /is_approved=eq\.true&user_id=is\.null/, "public story queries must select only approved global stories");

const videoSourceService = readFileSync("src/features/videos/services/video-sources.ts", "utf8");
assert.match(videoSourceService, /is_approved=eq\.true&user_id=is\.null/, "video generation must only source approved global stories");
assert.match(videoSourceService, /isPublicStoryRecord\(story\)/, "video source rows must be validated before use");

const storyRlsMigration = readFileSync(
  "supabase/migrations/20261117010000_stories_public_rls_requires_approved_global_rows.sql",
  "utf8",
);
assert.match(storyRlsMigration, /published IS TRUE\s+AND is_approved IS TRUE\s+AND user_id IS NULL/);
assert.match(storyRlsMigration, /private\.is_admin_user\(\)/);
