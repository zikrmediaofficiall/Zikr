import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldSuppressOfflineFallback } from "../../src/lib/data/publication-visibility-contract";

assert.equal(shouldSuppressOfflineFallback("unpublished"), true);
assert.equal(shouldSuppressOfflineFallback("unknown"), true);
assert.equal(shouldSuppressOfflineFallback("published"), false);
assert.equal(shouldSuppressOfflineFallback("missing"), false);

const fallbackPublicationStates = new Map([
  ["published", "published"],
  ["unpublished", "unpublished"],
  ["missing", "missing"],
  ["unknown", "unknown"],
] as const);
const fallbackItems = ["published", "unpublished", "missing", "unknown"] as const;
assert.deepEqual(
  fallbackItems.filter((slug) =>
    !shouldSuppressOfflineFallback(fallbackPublicationStates.get(slug) ?? "unknown"),
  ),
  ["published", "missing"],
  "list and search fallbacks must omit unpublished or unverifiable database records",
);

const helper = readFileSync("src/lib/data/publication-visibility.ts", "utf8");
assert.match(helper, /supabaseServerAdminRequest/);
assert.match(helper, /select=published&slug=eq/);
assert.match(helper, /cache: "no-store"/);
assert.match(helper, /return "unknown"/);
assert.match(helper, /CACHE_TTL_MS/);
assert.match(helper, /UNKNOWN_CACHE_TTL_MS/);
assert.match(helper, /inFlightLookups/);
assert.match(helper, /export async function getDatabasePublicationStates/);
assert.match(helper, /BATCH_LOOKUP_SIZE/);
assert.match(helper, /select=slug,published/);
assert.match(helper, /encodeURIComponent\(filter\)/);

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
assert.match(articleService, /getDatabasePublicationStates\(\s*"articles"/);
assert.match(articleService, /shouldSuppressOfflineFallback\(publicationStates\.get\(article\.slug\) \?\? "unknown"\)/);
const duaService = readFileSync("src/features/dua/services/dua.ts", "utf8");
assert.match(duaService, /databaseLookupFailed \? fallbackBase : FALLBACK_DUAS/, "successful empty dua queries must not reuse an old offline DB snapshot");
assert.match(duaService, /!databaseLookupFailed && localMatch/, "dua visibility checks must not run for arbitrary unknown slugs");
assert.equal(duaService.match(/getDatabasePublicationStates\(\s*"duas"/g)?.length, 2,
  "dua list and search fallbacks must both check canonical publication state");
const prophetService = readFileSync("src/features/prophets/services/prophets.ts", "utf8");
assert.match(prophetService, /database !== null/, "successful empty prophet queries must be distinguished from failed queries");
assert.match(prophetService, /!databaseLookupFailed && hasLocalFallback/, "prophet visibility checks must be limited to known fallback slugs");
assert.match(prophetService, /getDatabasePublicationStates\(\s*"prophets"/);
assert.match(prophetService, /shouldSuppressOfflineFallback\(publicationStates\.get\(prophet\.slug\) \?\? "unknown"\)/);

for (const [path, lookup] of serviceContracts) {
  const source = readFileSync(path, "utf8");
  assert.ok(source.includes(`getDatabasePublicationState(${lookup})`), `${path} must verify explicit database publication state before offline fallback`);
  assert.match(source, /shouldSuppressOfflineFallback\(publicationState\)/, `${path} must suppress fallback for unpublished or unverifiable records`);
}

console.log("Public detail-route publication visibility contracts passed.");
