import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getBlockedKidsRoutes, getPublishedKidsRoutes, isValidOfflineDatasetCount, resolveOfflineDatasetMinimum } from "../lib/offline-kids-route-safety.mjs";

const previousRows = [
  { type: "story", slug: "removed-approved-story", metadata: { age_appropriate: true }, published: true, is_active: true },
  { type: "story", slug: "approval-withdrawn", metadata: { age_appropriate: true }, published: true, is_active: true },
  { type: "game", slug: "removed-game", metadata: {}, published: true, is_active: true },
  { type: "quiz", slug: "removed-quiz", metadata: {}, published: true, is_active: true },
];
const currentRows = [
  { type: "story", slug: "current-approved-story", metadata: { age_appropriate: true }, published: true, is_active: true },
  { type: "story", slug: "approval-withdrawn", metadata: { age_appropriate: false }, published: true, is_active: true },
  { type: "game", slug: "current-game", metadata: {}, published: true, is_active: true },
  { type: "puzzle", slug: "current-double--hyphen", metadata: {}, published: true, is_active: true },
  { type: "puzzle", slug: "unsafe/slug", metadata: {}, published: true, is_active: true },
];

const blocked = getBlockedKidsRoutes(previousRows, currentRows, [
  "/kids/removed-approved-story",
  "/kids/approval-withdrawn",
  "/kids/removed-game",
  "/kids/removed-quiz",
  "/kids/kids-truth",
  "/kids/kids-amanah",
  "/kids/kids-prayer",
  "/kids/current-approved-story",
  "/kids/current-game",
  "/kids/unsafe/slug",
]);
assert.deepEqual(
  [...blocked].sort(),
  [
    "/kids/approval-withdrawn",
    "/kids/kids-amanah",
    "/kids/kids-prayer",
    "/kids/kids-truth",
    "/kids/removed-approved-story",
    "/kids/removed-game",
    "/kids/removed-quiz",
    "/kids/unsafe/slug",
  ],
);
assert.equal(blocked.has("/kids/current-approved-story"), false);
assert.equal(blocked.has("/kids/current-game"), false);
assert.equal(blocked.has("/kids/unsafe/slug"), true, "an unsafe current slug must not keep a stale nested route alive in the offline manifest");

const visibilityRows = [
  { type: "game", slug: "unpublished-game", published: false, is_active: true },
  { type: "game", slug: "inactive-game", published: true, is_active: false },
  { type: "unknown", slug: "unsupported-kind", published: true, is_active: true },
  { content_type: "puzzle", slug: "legacy-puzzle", published: true, is_active: true },
  { type: "activity", slug: "unsupported-activity", published: true, is_active: true },
  { type: "story", slug: "unapproved-story", published: true, is_active: true, metadata: { age_appropriate: false } },
  { type: "story", slug: "approved-story", published: true, is_active: true, metadata: { age_appropriate: true } },
];
assert.deepEqual(
  getPublishedKidsRoutes(visibilityRows),
  ["/kids/approved-story", "/kids/legacy-puzzle"],
  "server-side offline export must use the same published, active, supported-type and story-approval gates as the client",
);
assert.deepEqual(
  [...getBlockedKidsRoutes([], visibilityRows, ["/kids/unpublished-game", "/kids/inactive-game", "/kids/unsupported-kind", "/kids/unsupported-activity"])].sort(),
  ["/kids/inactive-game", "/kids/unapproved-story", "/kids/unpublished-game", "/kids/unsupported-activity", "/kids/unsupported-kind"],
  "unpublished, inactive, unsupported and unapproved-story rows must revoke previously cached detail routes",
);
assert.deepEqual(
  getPublishedKidsRoutes(currentRows),
  ["/kids/current-approved-story", "/kids/current-double--hyphen", "/kids/current-game"],
  "newly published and approved Kids slugs must be added to the offline route manifest while unapproved stories stay excluded",
);
const exporter = readFileSync("scripts/export-offline-content.mjs", "utf8");
const serviceWorker = readFileSync("public/sw.js", "utf8");
const offlinePack = readFileSync("src/lib/offline-pack.ts", "utf8");
assert.ok(offlinePack.includes("resolveSafeOfflineRoute(route, origin)"), "client offline route filtering must use the same-origin validator");
assert.ok(serviceWorker.includes('route.includes("\\\\")'), "service worker must reject raw backslashes before URL normalization");
assert.ok(serviceWorker.includes("/%(?:2f|5c)/i.test(route)"), "service worker must reject encoded slash and backslash route separators");
assert.match(
  serviceWorker,
  /const safeNotificationUrl = isSafeOfflineRoute\(data\.url\) \? data\.url : "\/";/,
  "push notification URLs must pass the same local-route safety check before being stored",
);
assert.match(
  serviceWorker,
  /const target = isSafeOfflineRoute\(rawTarget\) \? rawTarget : "\/";/,
  "notification clicks must revalidate stored targets and reject protocol-relative external URLs",
);
assert.equal(
  serviceWorker.includes('data.url.startsWith("/")'),
  false,
  "a leading slash alone must not authorize a protocol-relative notification URL",
);

assert.match(
  offlinePack,
  /fetch\(definition\.path,\s*\{\s*cache:\s*"no-store"/,
  "dataset refreshes must bypass the browser HTTP cache when the manifest version changes",
);
const offlineContentStart = serviceWorker.indexOf('if (url.pathname.startsWith(OFFLINE_CONTENT_PREFIX))');
const offlineContentEnd = serviceWorker.indexOf('if (url.pathname === "/api/prayer-times")', offlineContentStart);
assert.ok(offlineContentStart >= 0 && offlineContentEnd > offlineContentStart, "service worker must define an offline-content handler");
const offlineContentHandler = serviceWorker.slice(offlineContentStart, offlineContentEnd);
assert.ok(
  offlineContentHandler.indexOf('fetch(new Request(request, { cache: "no-store" }))') <
    offlineContentHandler.indexOf("caches.match(request)"),
  "offline datasets must refresh from the network before falling back to Cache Storage",
);
assert.match(offlineContentHandler, /cache\.put\(request, copy\)/);
assert.match(exporter, /assertCanonicalSupabaseProjectUrl\(rawSupabaseUrl\)/,
  "offline snapshots must reject a non-canonical Supabase project before any dataset read");
assert.match(exporter, /getBlockedKidsRoutes\(previousKidsRows, rows, previous\.routes\)/);
assert.match(exporter, /const blockedRoutes = new Set\(\[\.\.\.blockedKidsRoutes, \.\.\.blockedPublishedContentRoutes\]\)/);
assert.match(exporter, /previous\.routes\.filter\(\(route\) => !blockedRoutes\.has\(route\)\)/);
assert.match(exporter, /getPublishedKidsRoutes\(currentKidsRows\)/);
assert.match(exporter, /\.\.\.currentKidsRoutes/);
assert.match(exporter, /const stamp = generatedAt\.replace/);
assert.match(exporter, /version: `\$\{stamp\.slice\(0, 8\)\}-\$\{stamp\}`/);

const exportOrders = [...exporter.matchAll(/'order=([^']+)'/g)].map(match => match[1]);
assert.ok(exportOrders.length >= 20, "offline exporter must retain the complete dataset inventory");
for (const order of exportOrders) {
  assert.match(order, /(?:^|,)id\.asc$/, `offline pagination order must have a unique ID tie-breaker: ${order}`);
}




assert.deepEqual(
  [...getBlockedKidsRoutes(previousRows, [], [
    "/kids/removed-approved-story",
    "/kids/approval-withdrawn",
    "/kids/removed-game",
    "/kids/removed-quiz",
  ])].sort(),
  ["/kids/approval-withdrawn", "/kids/removed-approved-story", "/kids/removed-game", "/kids/removed-quiz"],
  "an empty verified Kids snapshot must revoke every previously exported Kids detail route",
);
assert.equal(resolveOfflineDatasetMinimum("kids", 20, true), 0,
  "a complete service-role read must allow a reduced or empty Kids public snapshot to be published");
assert.throws(
  () => resolveOfflineDatasetMinimum("kids", 20, false),
  /service-role key/,
  "a reduced Kids snapshot must never be inferred from an RLS-limited anonymous read",
);
assert.equal(resolveOfflineDatasetMinimum("articles", 10, false), 10,
  "the existing minimum floor for non-Kids datasets must remain unchanged");
assert.equal(isValidOfflineDatasetCount("kids", 0), true,
  "the offline verifier must accept an intentionally empty, fully verified Kids dataset");
assert.equal(isValidOfflineDatasetCount("articles", 0), false,
  "the offline verifier must continue rejecting empty non-Kids datasets");
assert.equal(isValidOfflineDatasetCount("kids", -1), false);
const offlineVerifier = readFileSync("scripts/verify-offline-content.mjs", "utf8");
assert.ok(offlineVerifier.includes("isValidOfflineDatasetCount(name, definition.count)"),
  "offline verification must allow zero only for the Kids dataset");
assert.match(exporter, /const apiKey = \(serviceRoleKey \|\| process\.env\.SUPABASE_ANON_KEY/,
  "required offline exports must prefer the protected service-role key over any configured anonymous key");
assert.ok(offlineVerifier.includes("getPublishedKidsRoutes(rows)"),
  "offline verification must reconcile Kids detail routes against the current exported dataset");
assert.ok(offlineVerifier.includes("supportedKidsTypes.has(type)"),
  "offline verification must reject unsupported Kids types instead of exposing unrouteable rows");
assert.match(
  exporter,
  /rows = rows\.filter\(\(row\) => row && \(row\.type !== ['"]story['"] \|\| row\.metadata\?\.age_appropriate === true\)\)/,
  "offline export must omit every Kids story without explicit age-appropriate approval",
);
assert.ok(
  offlineVerifier.includes("row?.metadata?.age_appropriate !== true"),
  "offline verification must fail when an unapproved Kids story appears in the public snapshot",
);

const refreshWorkflow = readFileSync(".github/workflows/refresh-offline-content.yml", "utf8");
assert.match(
  refreshWorkflow,
  /echo "::error::GitHub Actions token cannot create pull requests[\\s\\S]*?exit 1/,
  "offline refresh must fail visibly when it cannot create the review PR instead of reporting a false-green snapshot",
);

const committedKidsRows = JSON.parse(readFileSync("public/offline-content/v1/kids.json", "utf8"));
const committedOfflineManifest = JSON.parse(readFileSync("public/offline-content/v1/manifest.json", "utf8"));
assert.deepEqual(
  committedOfflineManifest.routes.filter(route => typeof route === "string" && route.startsWith("/kids/")).sort(),
  getPublishedKidsRoutes(committedKidsRows),
  "the committed offline manifest must include exactly the public Kids detail routes in the committed dataset",
);
const kidsValidationSource = readFileSync("src/features/kids/services/kids-content-validation.ts", "utf8");
const clientRouteSafetySource = readFileSync("src/lib/offline-route-safety.ts", "utf8");
const serverRouteSafetySource = readFileSync("scripts/lib/offline-kids-route-safety.mjs", "utf8");
const canonicalTypeBlock = kidsValidationSource.match(/export const KIDS_CONTENT_TYPES = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const clientTypeBlock = clientRouteSafetySource.match(/const SAFE_KIDS_CONTENT_TYPES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
const serverTypeBlock = serverRouteSafetySource.match(/const SAFE_KIDS_CONTENT_TYPES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
const readStringSet = (source) => [...source.matchAll(/["']([^"']+)["']/g)].map(match => match[1]).sort();
assert.ok(canonicalTypeBlock && clientTypeBlock && serverTypeBlock, "all Kids content type contracts must be discoverable");
assert.deepEqual(readStringSet(clientTypeBlock), readStringSet(canonicalTypeBlock),
  "client offline route safety must use exactly the supported Kids content types");
assert.deepEqual(readStringSet(serverTypeBlock), readStringSet(canonicalTypeBlock),
  "server offline export route safety must use exactly the supported Kids content types");

const offlinePackSource = readFileSync("src/lib/offline-pack.ts", "utf8");
const mergedRoutesStart = offlinePackSource.indexOf("function mergedRoutes");
const mergedRoutesEnd = offlinePackSource.indexOf("async function fetchSupplementalRouteInventory", mergedRoutesStart);
const mergedRoutesBody = offlinePackSource.slice(mergedRoutesStart, mergedRoutesEnd);
assert.match(mergedRoutesBody, /const safeAdditionalRoutes = filterOfflineSupplementalKidsRoutes\(additionalRoutes, currentKidsRoutes\)/,
  "sitemap and caller-provided route inventories must not reintroduce revoked Kids detail routes");
assert.match(mergedRoutesBody, /\.\.\.safeAdditionalRoutes/);
const offlineStatusStart = offlinePackSource.indexOf("export async function getOfflineLibraryStatus");
const offlineStatusEnd = offlinePackSource.indexOf("export async function getOfflineDataset", offlineStatusStart);
const offlineStatusBody = offlinePackSource.slice(offlineStatusStart, offlineStatusEnd);
assert.match(offlineStatusBody, /const existingKidsRows = await offlineDb\.getAll<unknown>\("kids"\)/,
  "offline status must read the current local Kids dataset before deciding which detail routes are required");
assert.match(offlineStatusBody, /getPublishedKidsOfflineRoutes\(existingKidsRows\)/);
assert.match(offlineStatusBody, /isOfflineRouteInventoryComplete\(requiredRoutes, completion\.cachedRoutes\)/,
  "offline status must reject stale extra routes as well as missing routes");
assert.match(offlineStatusBody, /verifyCompletedRoutes\(completion\.cachedRoutes\)/,
  "offline status must verify that the cached HTML entries still exist in Cache Storage");
const hydrateStart = offlinePackSource.indexOf("export async function hydrateOfflineContent");
const hydrateBody = offlinePackSource.slice(hydrateStart);
assert.match(hydrateBody, /isOfflineRouteInventoryComplete\(routeInventory, completion\.cachedRoutes\)/,
  "hydration must refresh when its cached route inventory contains stale extra routes");

const offlineWorkflow = readFileSync(".github/workflows/refresh-offline-content.yml", "utf8");
assert.ok(offlineWorkflow.includes('"scripts/lib/offline-kids-route-safety.mjs"'),
  "changes to Kids route revocation policy must trigger a fresh offline snapshot workflow");

console.log("Offline Kids route revocation contracts passed.");
