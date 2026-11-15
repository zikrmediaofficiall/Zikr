import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  filterOfflineSupplementalKidsRoutes,
  getPublishedKidsOfflineRoutes,
  isOfflineRouteInventoryComplete,
  resolveSafeOfflineRoute,
} from "../../src/lib/offline-route-safety";
import { KIDS_CONTENT_TYPES } from "../../src/features/kids/services/kids-content-validation";

const origin = "https://zikrmediaofficial.vercel.app";
assert.equal(resolveSafeOfflineRoute("/kids/story-ibrahim", origin)?.origin, origin);
assert.equal(resolveSafeOfflineRoute("/", origin)?.pathname, "/");
for (const route of [
  "//evil.example/path",
  "/\\\\evil.example/path",
  "/%5c%5cevil.example/path",
  "/%2f%2fevil.example/path",
  "/kids/%252e%252e/admin",
  "/kids/%25252e%25252e/admin",
  "/kids/%2525252e%2525252e/admin",
  "/articles/%252fprivate",
  "/articles/%255cprivate",
  "/kids/%ZZ",
  "/kids/story?token=secret",
  "/kids/story#fragment",
  "https://evil.example/path",
]) {
  assert.equal(resolveSafeOfflineRoute(route, origin), null, `unsafe offline route must be rejected: ${route}`);
}
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const supportedTypeRows = KIDS_CONTENT_TYPES.map((type) => ({
  slug: `supported-${type}`,
  type,
  published: true,
  is_active: true,
  metadata: type === "story" ? { age_appropriate: true } : {},
}));
const publishedKidsRoutes = getPublishedKidsOfflineRoutes([
  { slug: "approved-story", type: "story", published: true, is_active: true, metadata: { age_appropriate: true } },
  { slug: "unapproved-story", type: "story", published: true, is_active: true, metadata: { age_appropriate: false } },
  { slug: "legacy-story", content_type: "story", published: true, is_active: true, metadata: {} },
  { slug: "public-game", type: "game", published: true, is_active: true, metadata: {} },
  { slug: "unpublished-game", type: "game", published: false, is_active: true, metadata: {} },
  { slug: "inactive-game", type: "game", published: true, is_active: false, metadata: {} },
  { slug: "../unsafe", type: "game", published: true, is_active: true, metadata: {} },
  { slug: "unsupported", type: "unknown", published: true, is_active: true, metadata: {} },
  { slug: "legacy-activity", type: "activity", published: true, is_active: true, metadata: {} },
  ...supportedTypeRows,
]);
const expectedPublishedKidsRoutes = [
  "/kids/approved-story",
  "/kids/public-game",
  ...KIDS_CONTENT_TYPES.map((type) => `/kids/supported-${type}`),
].sort();
assert.deepEqual(
  publishedKidsRoutes,
  expectedPublishedKidsRoutes,
  "offline route inventory must include every supported Kids type, exclude legacy activity, and require explicit publication and story approval",
);
assert.deepEqual(
  filterOfflineSupplementalKidsRoutes([
    "/kids/story-old-unpublished",
    "/kids/zikr-kids-old-unpublished",
    "/kids/story-approved",
    "/kids/revoked-but-generic",
    "/kids/game-memory",
    "/kids/approved-story",
    "/kids/games",
    "/kids/adventures/",
    "/articles/old-article",
  ], publishedKidsRoutes),
  ["/kids/approved-story", "/kids/games", "/kids/adventures/", "/articles/old-article"],
  "supplemental offline routes must retain only current public Kids detail slugs plus real static Kids pages and unrelated route families",
);

const offlinePackSource = readFileSync(resolve(process.cwd(), "src/lib/offline-pack.ts"), "utf8");
const serviceWorkerSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const serviceWorkerRouteSafetyStart = serviceWorkerSource.indexOf("function hasUnsafeEncodedPathSegment(");
const serviceWorkerRouteSafetyEnd = serviceWorkerSource.indexOf("\\nfunction absoluteSameOriginUrl(", serviceWorkerRouteSafetyStart);
assert.ok(
  serviceWorkerRouteSafetyStart >= 0 && serviceWorkerRouteSafetyEnd > serviceWorkerRouteSafetyStart,
  "service worker must expose the bounded encoded-path traversal guard before URL normalization",
);
const serviceWorkerRouteSafety = runInNewContext(
  `${serviceWorkerSource.slice(serviceWorkerRouteSafetyStart, serviceWorkerRouteSafetyEnd)}\\n({ isSafeOfflineRoute })`,
  { self: { location: { origin } }, URL },
) as { isSafeOfflineRoute: (route: string) => boolean };
for (const route of [
  "/kids/%252e%252e/admin",
  "/kids/%25252e%25252e/admin",
  "/articles/%252fprivate",
  "/articles/%255cprivate",
  "/kids/%ZZ",
]) {
  assert.equal(serviceWorkerRouteSafety.isSafeOfflineRoute(route), false, `service worker must reject encoded traversal: ${route}`);
}
assert.match(offlinePackSource, /getPublishedKidsOfflineRoutes\(refreshedKidsRows\)/, "route pruning must include current Kids dataset slugs, even when the static manifest is stale");
assert.match(offlinePackSource, /filterOfflineSupplementalKidsRoutes\(manifest\.routes \?\? \[\], currentKidsRoutes\)/, "stale Kids story routes in the manifest must also be removed from the keep set");
assert.match(offlinePackSource, /filterOfflineSupplementalKidsRoutes\(supplementalRouteInventory, refreshedKidsRoutes\)/, "static supplemental routes must not reintroduce revoked Kids stories");
assert.match(offlinePackSource, /requestOfflineRoutePrune\(routeInventory\)/,
  "a successful offline refresh must reconcile cached routes against the current public inventory");
assert.match(serviceWorkerSource, /event\.data\.type === "PRUNE_OFFLINE_ROUTES"/,
  "the service worker must expose the stale-route pruning message");
assert.match(serviceWorkerSource, /request\.headers\.get\("accept"\)\?\.includes\("text\/html"\)/,
  "route pruning must only remove cached HTML, never datasets or static assets");
assert.match(serviceWorkerSource, /url\.origin !== self\.location\.origin/,
  "route pruning must remain restricted to same-origin cache entries");
assert.match(serviceWorkerSource, /cache\.delete\(request\)/,
  "stale HTML route entries must be removed from Cache Storage");

assert.equal(isOfflineRouteInventoryComplete(["/", "/kids/current"], ["/", "/kids/current"]), true);
assert.equal(isOfflineRouteInventoryComplete(["/", "/kids/current"], ["/", "/kids/current", "/kids/revoked"]), false,
  "a stale cached Kids route must make the offline inventory incomplete");
assert.equal(isOfflineRouteInventoryComplete(["/", "/kids/current"], ["/"]), false);
assert.equal(isOfflineRouteInventoryComplete(["/", "/kids/current"], ["/", "/kids/current", "/kids/current"]), false,
  "duplicate cached route entries must not be accepted as a complete inventory");

console.log("Offline route same-origin safety tests passed.");
