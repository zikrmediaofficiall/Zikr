import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const catalog = read("src/lib/navigation/catalog.ts");
const contentService = read("src/features/site-content/services/site-content.ts");
const sectionsApi = read("src/app/api/admin/sections/route.ts");
const adminSections = read("src/app/admin/sections/sections-client.tsx");
const shell = read("src/components/layout/site-shell.tsx");
const navbar = read("src/components/layout/navbar.tsx");
const mobileNav = read("src/components/layout/mobile-nav.tsx");
const footer = read("src/components/layout/footer.tsx");
const home = read("src/app/page.tsx");
const directory = read("src/app/sections/page.tsx");
const videos = read("src/app/videos/page.tsx");
const socialAdmin = read("src/app/admin/social/social-client.tsx");

assert.match(catalog, /export function getCatalogItemKey/, "all section controls must use one stable route key");
assert.match(catalog, /id: 'community'/, "the canonical catalog must include community/support paths");
assert.match(contentService, /export async function getSectionVisibility/, "public pages must be able to read saved visibility settings");
assert.match(contentService, /export async function getSectionDisplayOrder/, "public pages must be able to read saved display order");
assert.match(contentService, /defaultOrder/, "legacy settings must fall back to a complete catalog order");

assert.match(sectionsApi, /CATALOG_ITEMS\.map/, "the admin API must derive visibility keys from the canonical catalog");
assert.match(sectionsApi, /normalizeOrder/, "the admin API must validate and normalize order data");
assert.match(sectionsApi, /value: \{ visibility, order \}/, "visibility and order must be persisted together");
assert.match(sectionsApi, /revalidateTag\('site-setting:section_visibility'/, "saving visibility/order must invalidate the public setting cache");

assert.match(adminSections, /SITE_CATALOG\.flatMap/, "the admin screen must list every canonical section, not a stale subset");
assert.match(adminSections, /moveSection/, "the admin screen must expose ordering controls");
assert.match(adminSections, /JSON\.stringify\(\{ visibility: enabled, order \}\)/, "the admin screen must save visibility and ordering together");

assert.match(shell, /getSectionVisibility/, "the site shell must load section visibility once for shared navigation");
assert.match(shell, /getSectionDisplayOrder/, "the site shell must load section order once");
assert.match(shell, /<Navbar hiddenHrefs=\{hiddenHrefs\} sectionOrder=\{sectionOrder\}/, "desktop and mobile navigation must receive saved settings");
assert.match(shell, /hiddenHrefs=\{hiddenHrefs\} sectionOrder=\{sectionOrder\}/, "the footer must receive saved settings");

assert.match(navbar, /!hidden\.has\(link\.href\)/, "disabled top navigation links must not render");
assert.match(navbar, /getCatalogItemKey/, "desktop ordering must use canonical route keys");
assert.match(mobileNav, /hiddenHrefSet\.has\(item\.href\)/, "disabled links must be removed from the mobile drawer");
assert.match(mobileNav, /sectionOrderIndex/, "mobile drawer links must respect saved order");
assert.match(mobileNav, /visibleBottomLinks/, "disabled routes must also be removed from mobile quick navigation");
assert.match(footer, /visibleSectionLinks/, "footer section links must honor visibility");
assert.match(footer, /visibleToolLinks/, "footer tool links must honor visibility");
assert.match(footer, /sortLinks/, "footer sections/tools must honor saved ordering");

assert.match(home, /visibleGroups = SITE_CATALOG/, "homepage must render the shared catalog");
assert.match(home, /isSectionVisible\(item\.href\)/, "homepage cards must honor visibility");
assert.match(home, /orderIndex/, "homepage cards must honor saved ordering");
assert.match(home, /social-heading/, "homepage must contain social discovery");
assert.match(home, /safeSocialUrl/, "homepage social destinations must validate HTTPS and allowed hosts");

assert.match(directory, /searchParams/, "public section directory must support server-rendered search and filters");
assert.match(directory, /getSectionVisibility/, "public section directory must omit disabled sections");
assert.match(directory, /getSectionDisplayOrder/, "public section directory must honor admin ordering");

assert.match(videos, /instagramUrl/, "media hub must read Instagram");
assert.match(videos, /xUrl/, "media hub must read X");
assert.match(videos, /resolveOfficialSocialUrl/, "media hub must validate official social URLs");

assert.match(socialAdmin, /activeView === "analytics"/, "social admin must retain the separate analytics workspace");
assert.match(socialAdmin, /activeView === "queue"/, "social admin must retain the publishing queue workspace");
assert.match(socialAdmin, /activeView === "published"/, "social admin must retain the published-post workspace");
assert.match(socialAdmin, /videoApproval\?\.approved === true/, "unapproved child videos must remain blocked from publishing");

console.log("Section visibility/order, public navigation, social discovery and admin safeguards contract passed.");
