import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAVORITE_ITEM_TYPES, getFavoriteHref, isFavoriteId, isFavoriteItemType } from "../../src/features/favorites/services/favorite-links";

assert.deepEqual(FAVORITE_ITEM_TYPES, ["quran", "hadith", "story", "scholar", "dua"]);
for (const itemType of FAVORITE_ITEM_TYPES) assert.equal(isFavoriteItemType(itemType), true);
for (const invalidType of ["article", "video", "unknown", null, 1]) {
  assert.equal(isFavoriteItemType(invalidType), false);
}

for (const id of [
  "550e8400-e29b-41d4-a716-446655440000",
  "00000000-0000-0000-0000-000000000000",
  "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
]) assert.equal(isFavoriteId(id), true);
for (const id of [
  "",
  "not-a-uuid",
  "550e8400e29b41d4a716446655440000",
  "550e8400-e29b-41d4-a716-446655440000-extra",
  " 550e8400-e29b-41d4-a716-446655440000 ",
  "550e8400-e29b-41d4-a716-44665544000'; delete from favorites; --",
]) assert.equal(isFavoriteId(id), false);

const favoritesEnumMigration = readFileSync("supabase/migrations/20260530000400_0004_phase2_auth_foundation.sql", "utf8");
const favoritesEnumDefinition = favoritesEnumMigration.match(/CREATE TYPE favorite_item_type AS ENUM\s*\(([^)]+)\)/);
assert.ok(favoritesEnumDefinition, "the database favorite_item_type enum must exist");
const databaseFavoriteTypes = [...favoritesEnumDefinition[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.deepEqual([...FAVORITE_ITEM_TYPES], databaseFavoriteTypes, "runtime favorite types must match the database enum");

const favoritesServiceSource = readFileSync("src/features/favorites/services/favorites.ts", "utf8");
assert.match(favoritesServiceSource, /if \(!isFavoriteId\(normalizedId\)\)/, "favorite deletion by id must reject malformed UUIDs before querying Supabase");
assert.equal(
  (favoritesServiceSource.match(/if \(!isFavoriteItemType\(itemType\)\)/g) ?? []).length,
  4,
  "all favorite mutations and item-type reads must enforce the runtime enum guard",
);

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

const favoritesRouteSource = readFileSync("src/app/api/user/favorites/route.ts", "utf8");
assert.match(favoritesRouteSource, /result\.error === "Invalid"[\s\S]*?status: 400/, "malformed favorite IDs must map to HTTP 400");

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
