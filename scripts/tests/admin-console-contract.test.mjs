import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const layout = read("src/app/admin/layout.tsx");
const sidebar = read("src/features/admin/components/admin-sidebar.tsx");
const commandPalette = read("src/features/admin/components/admin-command-palette.tsx");
const moduleDirectory = read("src/features/admin/components/admin-module-directory.tsx");
const releasePage = read("src/app/admin/release/page.tsx");
const releaseAction = read("src/app/admin/release/actions.ts");
const adminCommandCenter = read("src/features/admin/components/admin-platform-command-center.tsx");
const videoRequests = read("src/features/admin/video-requests/components/admin-video-requests-client.tsx");

assert.ok(layout.includes("<AdminRouteBreadcrumbs groups={visibleGroups} />"), "Admin breadcrumbs must use permission-filtered navigation groups");
assert.ok(sidebar.includes("matchesAdminSearch(query") && sidebar.includes("matchesAdminSearch(mobileQuery"), "Desktop and mobile nav search must share matching behavior");
assert.ok(sidebar.includes("searchInputRef.current.getClientRects().length === 0") && sidebar.includes("mobileSearchInputRef.current.getClientRects().length === 0"), "Slash shortcut must not focus a hidden responsive search field");
assert.ok(commandPalette.includes("matchesAdminSearch(query"), "Command palette must use shared search normalization");
assert.ok(!moduleDirectory.includes('event.key.toLowerCase() === "k"') && !moduleDirectory.includes('event.key === "/"'), "Module directory must not register colliding global search shortcuts");
assert.ok(releasePage.includes("android-signing-preflight") && releasePage.includes("runAndroidReleaseSigningPreflightAction"), "Release center must offer a protected GPG preflight action");
assert.ok(releasePage.includes("disabled={!signingPreflight?.ready || operationIsActive || operationNeedsReview}"), "Release action must remain disabled until the exact-main GPG preflight passes");
assert.ok(releasePage.includes("ANDROID_RELEASE_TAG_GPG_PRIVATE_KEY") && releasePage.includes("ANDROID_RELEASE_TAG_GPG_FINGERPRINT"), "Release UI must list owner-managed protected signing settings");
assert.ok(!releasePage.includes("SIGNED_RELEASE_BLOCKER") && !releaseAction.includes("SIGNED_RELEASE_BLOCKER"), "Release UI and action must not hard-code a permanent signing blocker");
assert.ok(releaseAction.includes("prepareAndroidRelease") && releaseAction.includes("assertNoActiveReleaseOperation"), "Release action must prepare canonical metadata and prevent overlapping operations");
assert.ok(releaseAction.includes("recordAdminAuditEventSafely"), "Release preparation must preserve the admin audit trail");

for (const route of ["/admin/video", "/admin/social", "/admin/sections", "/admin/queues", "/admin/audio", "/admin/sources"]) {
  assert.ok(adminCommandCenter.includes(route), `admin command center quick actions must include ${route}`);
}
assert.match(adminCommandCenter, /quickActionCandidates\.filter\(\(\[, href\]\) => availableHrefs\.has\(href\)\)/, "quick actions must remain permission-filtered");

assert.ok(videoRequests.includes(String.raw`belongs to request\s+([0-9a-f]`), "duplicate renders must resolve the canonical request ID from the worker explanation");
assert.ok(videoRequests.includes("فتح الطلب الأصلي للمراجعة"), "duplicate renders must offer a direct action to review the canonical request");

console.log("Admin console navigation, video duplicate review, and signed-release safety contracts passed.");
