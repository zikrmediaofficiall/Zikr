import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fallback = readFileSync("src/features/dua/data/fallback.ts", "utf8");
const service = readFileSync("src/features/dua/services/dua.ts", "utf8");
const type = readFileSync("src/features/dua/types/dua.ts", "utf8");
const index = readFileSync("src/app/dua/page.tsx", "utf8");
const detail = readFileSync("src/app/dua/[slug]/page.tsx", "utf8");

const expected = [
  ["rabbana-atina", "https://quran.com/2/201"],
  ["rabbi-zidni-ilma", "https://quran.com/20/114"],
  ["rabbi-ishrah-li-sadri", "https://quran.com/20/25-28"],
  ["rabbana-la-tuzigh", "https://quran.com/3/8"],
  ["allahumma-innaka-afuw", "https://sunnah.com/tirmidhi:3513"],
  ["allahumma-a-inni-ala-dhikrik", "https://sunnah.com/abudawud:1522"],
  ["sayyid-al-istighfar", "https://sunnah.com/bukhari:6306"],
  ["rabbighfir-li-wa-liwalidayya", "https://quran.com/71/28"],
  ["hasbi-allahu", "https://quran.com/9/129"],
  ["rabbana-zalamna", "https://quran.com/7/23"],
  ["rabbana-taqabbal-minna", "https://quran.com/2/127"],
  ["rabbana-afrigh-alayna-sabran", "https://quran.com/2/250"],
  ["rabbi-inni-lima-anzalta", "https://quran.com/28/24"],
  ["rabbana-hab-lana", "https://quran.com/25/74"],
  ["rabbi-awzini", "https://quran.com/27/19"],
  ["rabbi-hab-li-min-ladunka", "https://quran.com/3/38"],
  ["rabbana-la-tuakhidhna", "https://quran.com/2/286"],
  ["rabbana-ghfir-lana", "https://quran.com/3/147"],
];

assert.match(type, /sourceUrl\?: string/);
assert.equal((fallback.match(/\{id:'fd\d+'/g) ?? []).length, 20, "the emergency fallback catalogue should contain 20 reviewed supplications");
for (const [slug, url] of expected) {
  assert.ok(service.includes('"' + slug + '": "' + url + '"'), "verified source mapping is missing for " + slug);
}
for (const slug of ["rabbana-taqabbal-minna", "rabbana-afrigh-alayna-sabran", "rabbi-inni-lima-anzalta", "rabbana-hab-lana", "rabbi-awzini", "rabbi-hab-li-min-ladunka", "rabbana-la-tuakhidhna", "rabbana-ghfir-lana"]) {
  assert.ok(fallback.includes("slug:'" + slug + "'"), "curated fallback dua is missing: " + slug);
}
assert.match(service, /sourceUrl: VERIFIED_DUA_SOURCE_URLS\[String\(row\.slug \?\? ""\)\]/);
assert.match(index, /href=\{dua\.sourceUrl\}/, "dua index must allow users to open a verified source");
assert.match(detail, /href=\{dua\.sourceUrl\}/, "dua detail must allow users to open a verified source");
assert.match(index, /rel="noopener noreferrer"/);
assert.match(detail, /rel="noopener noreferrer"/);

console.log("Dua source-link and fallback coverage contracts passed.");
