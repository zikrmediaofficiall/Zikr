import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/app/page.tsx", "utf8");
const catalog = readFileSync("src/lib/navigation/catalog.ts", "utf8");

assert.match(home, /const visibleGroups = SITE_CATALOG;/, "Home must render every catalogue group");
assert.doesNotMatch(home, /FEATURED_GROUP_IDS/, "Home must not silently filter out top-level groups");
assert.match(home, /All eight main groups are visible here/, "English Home copy must disclose the full section directory");
assert.match(home, /المجموعات الثماني ظاهرة هنا/, "Arabic Home copy must disclose the full section directory");
assert.match(home, /group\.items\.slice\(0,\s*3\)/, "Home must keep each group preview compact and link to the full directory");
assert.equal((catalog.match(/id:\s*['"](?:revelation|remembrance|daily|history|knowledge|audio|kids|platform)['"]/g) ?? []).length, 8,
  "the eight expected top-level section groups must remain in the canonical catalogue");

console.log("Homepage section visibility contract passed.");
