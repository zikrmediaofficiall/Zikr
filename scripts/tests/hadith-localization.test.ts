import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasHadithPageRows, resolveHadithBookName, resolveHadithDisplay } from "../../src/features/hadith/types/hadith";
import { createOfflineHadithBooksLoader } from "../../src/features/hadith/services/offline-books-loader";
import { shouldFallbackToExternalHadith } from "../../src/features/hadith/services/database-fallback-policy";

const translated = resolveHadithDisplay(
  { number: 1, arab: "النص العربي", english: "English translation", contentLocale: "en" },
  "en",
);
assert.equal(translated.text, "English translation");
assert.equal(translated.contentLocale, "en");
assert.equal(translated.usedArabicFallback, false);

const originalFallback = resolveHadithDisplay(
  { number: 2, arab: "النص العربي الأصلي" },
  "en",
);
assert.equal(originalFallback.text, "النص العربي الأصلي");
assert.equal(originalFallback.contentLocale, "ar");
assert.equal(originalFallback.usedArabicFallback, true);

const arabicRequest = resolveHadithDisplay(
  { number: 3, arab: "النص العربي", english: "English translation" },
  "ar",
);
assert.equal(arabicRequest.text, "النص العربي");
assert.equal(arabicRequest.contentLocale, "ar");
assert.equal(arabicRequest.usedArabicFallback, false);

assert.equal(hasHadithPageRows([{ number: 1 }]), true, "a non-empty local page should be used");
assert.equal(hasHadithPageRows([]), false, "an empty partial seed page must fall back to the remote provider");
assert.equal(hasHadithPageRows(null), false, "a failed local query must fall back to the remote provider");
assert.equal(hasHadithPageRows(undefined), false, "an absent local result must fall back to the remote provider");

assert.equal(resolveHadithBookName("صحيح البخاري", "Sahih al-Bukhari", "en"), "Sahih al-Bukhari");
assert.equal(resolveHadithBookName("صحيح البخاري", "Sahih al-Bukhari", "ar"), "صحيح البخاري");
assert.equal(resolveHadithBookName("صحيح البخاري", null, "en"), "صحيح البخاري", "offline English labels must fall back safely when unavailable");
assert.equal(shouldFallbackToExternalHadith([]), false, "a successful empty published-only database search must not fall through to the external catalogue");
assert.equal(shouldFallbackToExternalHadith(null), true, "an unavailable database search may use the external catalogue");
assert.equal(hasHadithPageRows([{ number: 1 }]), true, "non-empty local search rows remain authoritative");

const offlineRows = [
  {
    slug: "bukhari",
    name_ar: "صحيح البخاري",
    name_en: "Sahih al-Bukhari",
    hadith_count: 7009,
  },
];
let offlineReadCount = 0;
const loadOfflineBooks = createOfflineHadithBooksLoader(async () => {
  offlineReadCount += 1;
  return offlineRows;
});
const englishOfflineBooks = await loadOfflineBooks("en");
const arabicOfflineBooks = await loadOfflineBooks("ar");
assert.equal(offlineReadCount, 1, "locale changes must reuse the locale-neutral offline source read");
assert.equal(englishOfflineBooks[0]?.name, "Sahih al-Bukhari");
assert.equal(arabicOfflineBooks[0]?.name, "صحيح البخاري");

const hadithService = readFileSync("src/features/hadith/services/hadith.ts", "utf8");
assert.ok(hadithService.includes("getOfflineHadithBooks(locale)"), "offline collection names must use the requested locale");
assert.ok(hadithService.includes("createOfflineHadithSnapshotLoader"), "the offline hadith cache must validate and reuse the committed snapshot");
assert.ok(hadithService.includes("normalizeOfflineHadithSnapshot"), "offline rows must pass through the published-only snapshot validator");
assert.ok(hadithService.includes("if (!shouldFallbackToExternalHadith(dbHadiths))"), "successful empty published-only database results must remain authoritative");
assert.ok(hadithService.includes("return dbHadiths.map(mapDbHadith)"), "Arabic originals must remain available when English translation is missing");
assert.ok(
  hadithService.includes("return getUmmahBook(clean, page, limit, locale);"),
  "English and Arabic book pages must both use the remote fallback when local book rows are unavailable",
);
assert.doesNotMatch(
  hadithService,
  /return locale === "en"\s*\?\s*null/,
  "English book pages must not disappear solely because the local catalogue is unavailable",
);

console.log("Hadith localization and empty-search fallback contracts passed.");
