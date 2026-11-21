import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/app/page.tsx", "utf8");
const catalog = readFileSync("src/lib/navigation/catalog.ts", "utf8");
const sections = readFileSync("src/app/sections/page.tsx", "utf8");

assert.match(home, /const visibleGroups = SITE_CATALOG/, "Home must render the canonical catalogue");
assert.match(home, /getSectionVisibility/, "Home must consume the persisted administrator visibility settings");
assert.match(home, /getSectionDisplayOrder/, "Home must consume the persisted administrator section order");
assert.match(home, /bySectionOrder\(QUICK_ACTIONS\.filter/, "Quick actions must follow the administrator display order");
assert.match(home, /isSectionVisible\(item\.href\)/, "Home category previews must exclude hidden sections");
assert.match(home, /showPrayerTimes !== false && isSectionVisible\('\/prayer-times'\)/, "Prayer times must respect both homepage settings and section visibility");
assert.match(home, /social-heading/, "Home must provide an official social-channel discovery section");
assert.match(home, /safeSocialUrl/, "Homepage external social links must be HTTPS and host-validated");
assert.match(home, /group\.items\s*\.filter/, "Home must only render enabled catalogue routes");
assert.match(home, /group\.items\.slice\(0,\s*3\)/, "Home must keep each group preview compact and link to the full directory");
assert.match(catalog, /id: 'community'/, "The canonical catalogue must include community and support routes");
assert.match(sections, /getSectionVisibility/, "The section directory must honor administrator visibility");
assert.match(sections, /getSectionDisplayOrder/, "The section directory must honor administrator ordering");
assert.match(sections, /searchParams/, "The section directory must support URL-based search and filters");

const historyGroup = catalog.slice(catalog.indexOf("id: 'history'"), catalog.indexOf("id: 'knowledge'"));
assert.ok(historyGroup.indexOf("href: '/stories'") < historyGroup.indexOf("href: '/scholars'"),
  "stories must appear before scholars in the Seerah and History group");

console.log("Homepage section visibility and discovery contract passed.");
