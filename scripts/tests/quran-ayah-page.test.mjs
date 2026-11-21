import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

const shareButton = read("src/components/ui/share-button.tsx");
const quranPage = read("src/app/quran/[surah]/[ayah]/page.tsx");
const hadithPage = read("src/app/hadith/[book]/[id]/page.tsx");
const routeParams = read("src/lib/route-params.ts");
const searchService = read("src/features/search/services/search.ts");
const quranTypes = read("src/features/quran/types/quran.ts");
const quranService = read("src/features/quran/services/quran.ts");
const quranServer = read("src/features/quran/services/quran-server.ts");
const surahPage = read("src/app/quran/[surah]/page.tsx");
const siteShell = read("src/components/layout/site-shell.tsx");
const hadithFallback = read("src/features/hadith/data/fallback.ts");

assert.match(shareButton, /Capacitor\.isNativePlatform\(\)/, "native pages must use the Capacitor Share plugin");
assert.match(shareButton, /navigator\.share/, "web pages must use the Web Share API when available");
assert.match(shareButton, /navigator\.clipboard\?\.writeText/, "share must fall back to copying the content and URL");
assert.match(shareButton, /AbortError/, "cancelling the native/web share sheet must not be reported as a failure");
assert.match(shareButton, /aria-live="polite"/, "share feedback must be announced to assistive technology");

assert.match(routeParams, /typeof value !== "string"/, "route IDs must be strings, not coercible numeric values");
assert.match(routeParams, /\/\^\[1-9\]\\d\*\$\//, "route IDs must use canonical positive decimal digits only");
assert.match(routeParams, /Number\.isSafeInteger\(parsed\)/, "route IDs must stay within JavaScript's safe integer range");
const parsePositiveIntegerRouteSegment = (value) => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};
assert.equal(parsePositiveIntegerRouteSegment("1"), 1);
assert.equal(parsePositiveIntegerRouteSegment("114"), 114);
for (const invalid of ["0", "01", "+1", "1.0", "1e2", "0x10", " 1", "1abc", "9007199254740992"]) {
  assert.equal(parsePositiveIntegerRouteSegment(invalid), null, `non-canonical route segment ${invalid} must be rejected`);
}
assert.match(quranPage, /parsePositiveIntegerRouteSegment\(p\.surah\)/, "Quran surah IDs must use the shared decimal parser");
assert.match(quranPage, /parsePositiveIntegerRouteSegment\(p\.ayah\)/, "Quran ayah IDs must use the shared decimal parser");
assert.match(quranPage, /surahId > 114/, "Quran route must reject surah numbers outside the canonical range");
assert.doesNotMatch(quranPage, /Number\(p\.surah\)|Number\(p\.ayah\)/, "Quran route must not coerce hexadecimal or exponent notation");
assert.match(quranPage, /<ShareButton/, "Quran ayah page must use the functional share control");
assert.doesNotMatch(quranPage, /Share2|جاري تحميل التفسير/, "Quran ayah page must not retain inert share or permanent loading UI");
assert.match(quranPage, /لا يتوفر تفسير مسجل لهذه الآية حالياً/, "a completed missing-tafsir read must render an empty state");
assert.match(quranPage, /getRequestLocale\(\)/, "individual ayah pages must respect the selected language");
assert.match(quranPage, /textEn/, "English ayah pages must render their attributed English translation");
assert.match(quranPage, /en\.pickthall/, "English Quran must identify its translation edition");
assert.match(quranPage, /translationAvailable/, "missing English translations must not render as empty text");
assert.match(surahPage, /getSurahFromDb\(id, locale\)/, "Surah pages must request the selected language");
assert.match(surahPage, /English translation is not available/, "Surah pages must render a clear fallback for untranslated verses");
assert.match(quranService, /translationAvailable: Boolean\(ayah\.text_en\?\.trim\(\)\)/, "Quran data mapping must expose translation availability");
assert.match(quranService, /text_en\.ilike/, "Quran search must include the English translation");
assert.match(quranServer, /text_en_edition/, "Quran data mapping must preserve edition provenance");

assert.match(hadithPage, /<ShareButton/, "Hadith detail page must use the functional share control");
assert.doesNotMatch(hadithPage, /Share2/, "Hadith detail page must not retain an inert share button");
assert.match(hadithPage, /parsePositiveIntegerRouteSegment\(hadithNumber\)/, "Hadith route IDs must use the shared decimal parser");
assert.doesNotMatch(hadithPage, /Number\(hadithNumber\)|parseInt\(hadithNumber/, "Hadith route must not coerce hexadecimal, exponent, or trailing non-numeric path characters");

assert.match(quranTypes, /surahNumber\?: number/, "Quran search results must retain their canonical surah number");
assert.match(quranService, /surahNumber: ayah\.surah_id/, "database Quran rows must preserve surah_id when mapped");
assert.match(searchService, /type: "ayah"/, "Quran search results must use the ayah result type");
assert.match(searchService, /href: `\/quran\/\$\{ayah\.surahNumber\}\/\$\{ayah\.numberInSurah\}`/, "Quran search results must link to the exact surah and ayah");
assert.doesNotMatch(searchService, /href: "\/quran"/, "Quran ayah fallback results must not all point to the generic Quran route");
assert.match(siteShell, /href="#main-content"/, "the site shell must provide a skip-to-content link");
assert.match(siteShell, /initialLocale === 'ar'/, "the skip-link label must follow the selected site language");
assert.match(siteShell, /Skip to content/, "English pages must receive an English skip-link label");
assert.match(siteShell, /<main id="main-content" tabIndex=\{-1\}>/, "the skip-link target must be focusable");
for (const verifiedRef of ["muslim:2699a", "bukhari:5027", "muslim:55a"]) {
  assert.ok(hadithFallback.includes(`ref:'${verifiedRef}'`), `Hadith fallback must cite verified reference ${verifiedRef}`);
}

assert.match(quranPage, /getRequestLocale\(\)/, "English Quran verse routes must respect the selected site language");
assert.match(quranPage, /textEn/, "English ayah details must expose the selected translation text");
assert.match(quranPage, /translationAvailable/, "untranslated verses must not render as blank");
assert.match(quranPage, /en\.pickthall|Marmaduke Pickthall/, "English Quran must show its translation edition");
assert.match(surahPage, /getSurahFromDb\(id, locale\)/, "Surah reading must request the current locale");
assert.match(surahPage, /English translation is not available/, "untranslated verses must show a helpful fallback");
assert.match(quranService, /text_en_edition/, "the Quran service must preserve translation provenance");
assert.match(quranService, /translationAvailable: Boolean\(ayah\.text_en\?\.trim\(\)\)/, "Quran mapping must expose translation availability");
assert.match(quranService, /text_en\.ilike/, "Quran search must include English translations");
assert.match(quranServer, /text_en_edition/, "server Quran reads must select the translation edition");
assert.match(quranServer, /if \(locale !== "en"\)/, "English reading must bypass the Arabic-only local corpus");
console.log("Quran/Hadith routes, exact verse search links, skip navigation, verified references, share controls, and tafsir empty-state contracts passed.");
