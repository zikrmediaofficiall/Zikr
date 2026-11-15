import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAVORITE_ITEM_TYPES, getFavoriteHref, isFavoriteItemType } from "../../src/features/favorites/services/favorite-links";

assert.deepEqual(FAVORITE_ITEM_TYPES, ["quran", "hadith", "story", "scholar", "dua"]);
for (const itemType of FAVORITE_ITEM_TYPES) assert.equal(isFavoriteItemType(itemType), true);
for (const invalidType of ["article", "video", "unknown", null, 1]) {
  assert.equal(isFavoriteItemType(invalidType), false);
}

assert.equal(getFavoriteHref("quran", "quran:2:255"), "/quran/2/255");
assert.equal(getFavoriteHref("hadith", "hadith:sahih-bukhari:42"), "/hadith/sahih-bukhari/42");
assert.equal(getFavoriteHref("story", "story:prophet-ibrahim"), "/stories/prophet-ibrahim");
assert.equal(getFavoriteHref("scholar", "scholar:ibn-kathir"), "/scholars/ibn-kathir");
assert.equal(getFavoriteHref("dua", "dua:morning-adhkar"), "/dua/morning-adhkar");
// Legacy URL resolution is retained, but article/video are not valid database favorite types.
assert.equal(getFavoriteHref("article", "article:verified-story"), "/articles/verified-story");
assert.equal(getFavoriteHref("video", "video:kids-garden"), "/videos/kids-garden");
assert.equal(getFavoriteHref("unknown", "unknown:record"), "/favorites");
assert.equal(getFavoriteHref("dua", "dua:morning adhkar"), "/dua/morning%20adhkar");

const bookmarkComponent = readFileSync("src/features/quran/components/bookmark-button.tsx", "utf8");
assert.match(bookmarkComponent, /itemType:\s*FavoriteItemType/);
assert.doesNotMatch(bookmarkComponent, /itemType\s*=\s*["']quran["']/);

const favoritesPage = readFileSync("src/app/favorites/page.tsx", "utf8");
assert.ok(favoritesPage.includes("getFavoriteHref"), "the favorites page must use the tested route resolver");
assert.match(favoritesPage, /typeLabels:\s*Record<FavoriteItemType,\s*string>/);
assert.match(favoritesPage, /type FavoriteItemType/);
assert.doesNotMatch(favoritesPage, /\b(?:article|video):\s*['"]/);

for (const [path, expectedType] of [
  ["src/app/quran/[surah]/page.tsx", 'itemType="quran"'],
  ["src/app/quran/[surah]/[ayah]/page.tsx", 'itemType="quran"'],
  ["src/app/hadith/[book]/[id]/page.tsx", 'itemType="hadith"'],
] as const) {
  const source = readFileSync(path, "utf8");
  assert.ok(source.includes(expectedType), path + " must pass its explicit favorite item type");
}

console.log("Favorite route resolution and bookmark item-type contracts passed.");
