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

assert.ok(layout.includes("<AdminRouteBreadcrumbs groups={visibleGroups} />"), "Admin breadcrumbs must use permission-filtered navigation groups");
assert.ok(sidebar.includes("matchesAdminSearch(query") && sidebar.includes("matchesAdminSearch(mobileQuery"), "Desktop and mobile nav search must share matching behavior");
assert.ok(sidebar.includes("searchInputRef.current.getClientRects().length === 0") && sidebar.includes("mobileSearchInputRef.current.getClientRects().length === 0"), "Slash shortcut must not focus a hidden responsive search field");
assert.ok(commandPalette.includes("matchesAdminSearch(query"), "Command palette must use shared search normalization");
assert.ok(!moduleDirectory.includes('event.key.toLowerCase() === "k"') && !moduleDirectory.includes('event.key === "/"'), "Module directory must not register colliding global search shortcuts");
assert.ok(releasePage.includes("disabled") && releasePage.includes("android-release-blocker"), "Release start control must be visibly disabled with an explicit signing blocker");
assert.ok(!releasePage.includes("Git tag موثقًا") && !releasePage.includes("تم إطلاق عملية الإصدار"), "Release UI must not claim an unsigned tag was verified or started based on query parameters");
const hardStop = releaseAction.indexOf("SIGNED_RELEASE_BLOCKER");
const stopRedirect = releaseAction.indexOf("redirect(\"/admin/release?android_release_error=\"");
assert.ok(hardStop >= 0 && stopRedirect >= 0, "Server action must redirect with an explicit signed-tag blocker");
assert.ok(!releaseAction.includes("prepareAndroidRelease") && !releaseAction.includes("supabaseServerAdminRequest"), "Blocked server action must not retain any callable release-creation or metadata-write path");

for (const route of ["/admin/video", "/admin/social", "/admin/sections", "/admin/queues", "/admin/audio", "/admin/sources"]) {
  assert.ok(adminCommandCenter.includes(route), `admin command center quick actions must include ${route}`);
}
assert.match(adminCommandCenter, /quickActionCandidates\.filter\(\(\[, href\]\) => availableHrefs\.has\(href\)\)/, "quick actions must remain permission-filtered");

console.log("Admin console navigation and signed-release safety contracts passed.");
