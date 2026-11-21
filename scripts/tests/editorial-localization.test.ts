import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getEnglishEditorialPage } from "../../src/components/content/editorial-depth.en";

const arabicCharacters = /[\u0600-\u06ff]/;
const editorialRoutes = [
  "/", "/quran", "/hadith", "/adhkar", "/dua", "/prophets", "/companions",
  "/scholars", "/articles", "/stories", "/tafsir", "/battles", "/conquests",
  "/mushaf", "/reciters", "/kids", "/poetry", "/tawasheeh", "/videos",
  "/platform", "/faq",
];

for (const route of editorialRoutes) {
  const page = getEnglishEditorialPage(route);
  assert.ok(page, "English editorial guide must exist for " + route);
  assert.ok(page.label.trim().length > 3, "English guide label must not be empty: " + route);
  assert.ok(page.intro.trim().length > 80, "English guide introduction must be substantial: " + route);
  assert.ok(page.sections.length >= 4, "Each main section must have at least four editorial sections: " + route);
  for (const section of page.sections) {
    assert.ok(section.heading.trim().length > 3, "Section heading must be present: " + route);
    assert.ok(section.paragraphs.length >= 2, "Each editorial section must contain at least two paragraphs: " + route);
    for (const paragraph of section.paragraphs) {
      assert.ok(paragraph.trim().length > 60, "Editorial paragraph must contain useful detail: " + route);
      assert.doesNotMatch(paragraph, arabicCharacters, "English guide must not leak Arabic copy: " + route);
    }
  }
}

for (const route of ["/quran/2", "/hadith/bukhari", "/dua/travel", "/prophets/yusuf", "/companions/abu-bakr", "/scholars/example", "/articles/example", "/stories/example", "/videos/example", "/kids/example"]) {
  assert.ok(getEnglishEditorialPage(route), "Dynamic detail route must receive an English editorial guide: " + route);
}

const utilitySource = readFileSync("src/components/content/editorial-utility-depth.tsx", "utf8");
const siteShell = readFileSync("src/components/layout/site-shell.tsx", "utf8");
const deepSource = readFileSync("src/components/content/editorial-depth.tsx", "utf8");
for (const route of [
  "/prayer-times", "/qibla", "/tasbeeh", "/memorization", "/wird", "/zakat",
  "/spiritual-ai", "/radio", "/youtube", "/search", "/offline-library",
]) {
  assert.ok(utilitySource.includes('"' + route + '": {'), "English utility guide is missing: " + route);
}
assert.ok(siteShell.includes("EditorialDepth pathname={pathname} locale={initialLocale}"),
  "the request locale must reach the long-form editorial guide");
assert.ok(siteShell.includes("EditorialUtilityDepth pathname={pathname} locale={initialLocale}"),
  "the request locale must reach the utility guide");
assert.ok(deepSource.includes('locale === "en"') && deepSource.includes('dir={direction}'),
  "the editorial renderer must switch translated content and text direction");
assert.ok(utilitySource.includes('locale === "en"') && utilitySource.includes('dir={direction}'),
  "the utility renderer must switch translated content and text direction");

console.log("English editorial localization and long-form page coverage passed.");
