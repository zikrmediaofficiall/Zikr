import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/app/page.tsx", "utf8");
const catalog = readFileSync("src/lib/navigation/catalog.ts", "utf8");
const sections = readFileSync("src/app/sections/page.tsx", "utf8");

assert.match(home, /const visibleGroups = SITE_CATALOG/, "Home must render the canonical catalogue");
assert.match(home, /getVideos\(undefined, 4\)/, "Home must surface recent published videos from the canonical video service");
assert.match(home, /showFeaturedVideos[\s\S]*?isSectionVisible\('\/videos'\)/, "Featured videos must obey section visibility and homepage settings");
assert.match(home, /featured-videos-heading/, "Home must include a dedicated published video shelf");
assert.match(home, /استكشف كل أقسام ذِكر/, "Hero must include a clear route to section discovery");
assert.match(home, /getSectionVisibility/, "Home must consume the persisted administrator visibility settings");
assert.match(home, /getSectionDisplayOrder/, "Home must consume the persisted administrator section order");
assert.match(home, /HomeHeroArt/, "Home hero must include its branded illustration (inlined SVG component)");
assert.match(home, /grid w-full min-w-0 max-w-6xl grid-cols-1/, "The mobile hero must use one bounded, shrinkable grid column");
assert.match(home, /w-full min-w-0 text-center lg:text-right/, "Hero copy must shrink within the mobile viewport");
assert.match(home, /flex w-full min-w-0 flex-col items-stretch/, "Hero actions must stack and fit narrow screens");
assert.match(home, /aspect-\[9\/10\]/, "Hero artwork frame must match the SVG source aspect ratio");
assert.match(home, /relative mx-auto w-full min-w-0 max-w-\[320px\]/, "Hero artwork wrapper must not exceed the available mobile width");
assert.match(home, /lg:grid-cols-\[minmax\(0,1\.08fr\)_minmax\(300px,0\.92fr\)\]/, "Home hero must use a responsive text and image layout");
assert.match(home, /shadow-\[0_28px_90px_rgba\(0,0,0,\.36\)\]/, "Home hero illustration must have a dedicated visual frame");
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
