import assert from "node:assert/strict";
import { buildDuaVideoTitle, buildQuranVideoTitle, fitTitle, resolveSeoTerms } from "../../src/features/videos/services/video-seo";

const quran = resolveSeoTerms("quran", "general");
assert.ok(quran.hashtags.includes("#القرآن_الكريم") && quran.hashtags[0] === "#ذكر" && quran.hashtags.length <= 4);
assert.ok(quran.tags.includes("quran") && quran.tags.includes("zikr"));
assert.ok(quran.tags.join(",").length <= 500, "tag budget respected");
const kids = resolveSeoTerms("story", "kids");
assert.deepEqual(kids.hashtags, ["#ذكر", "#تدبر", "#اسلاميات"], "kids videos keep the generic set");
assert.ok(!kids.tags.includes("قصص الأنبياء"), "kids videos get no category expansion");
assert.deepEqual(resolveSeoTerms("unknown").hashtags, ["#ذكر", "#تدبر", "#اسلاميات"]);
assert.equal(fitTitle("قصير", 100), "قصير");
const long = fitTitle("كلمة ".repeat(40), 100);
assert.ok(long.length <= 100 && long.endsWith("…") && !long.endsWith(" …"), "title cut at a word boundary");
console.log("Video SEO contracts passed.");

import { listTitleHooks, pickTitleHook } from "../../src/features/videos/services/video-seo";
assert.equal(pickTitleHook("quran", "id-1"), pickTitleHook("quran", "id-1"), "title hook is stable per request");
assert.equal(listTitleHooks("quran")[0], "آية قصيرة تستحق دقيقة من التدبر", "the long-standing phrase stays first");
const seen = new Set<string>();
for (let i = 0; i < 200; i += 1) seen.add(pickTitleHook("hadith", `r${i}`));
assert.equal(seen.size, 3, "all three variants are used");
for (const category of ["quran", "hadith", "dua", "adhkar", "story", "other"]) {
  for (const hook of listTitleHooks(category)) assert.ok(!/أجر|ثواب|حسنات|يغفر|مضمون/.test(hook), "no reward claims in hooks: " + hook);
}
const quranTitle = buildQuranVideoTitle({ surahName: "النحل", surahId: 16, ayahNumber: 124, ayahText: "إِنَّمَا جُعِلَ ٱلسَّبْتُ عَلَى ٱلَّذِينَ ٱخْتَلَفُوا۟ فِيهِ" });
assert.equal(quranTitle, "آية اليوم — النحل 16:124 | إِنَّمَا جُعِلَ ٱلسَّبْتُ عَلَى ٱلَّذِينَ…");
assert.ok(buildQuranVideoTitle({ surahName: "النحل", surahId: 16, ayahNumber: 1, ayahText: "" }).endsWith("16:1"));
assert.ok(buildQuranVideoTitle({ surahName: "النحل", surahId: 16, ayahNumber: 1, ayahText: "كلمة ".repeat(40) }).length <= 100);
assert.equal(buildDuaVideoTitle({ titleAr: "دعاء قبول العمل", occasionAr: "بعد العمل الصالح" }), "دعاء اليوم — دعاء قبول العمل (بعد العمل الصالح)");
assert.equal(buildDuaVideoTitle({ titleAr: "دعاء الثبات بعد الهداية", occasionAr: null }), "دعاء اليوم — دعاء الثبات بعد الهداية");
assert.equal(buildDuaVideoTitle({ titleAr: "دعاء طلب الثبات", occasionAr: "طلب الثبات" }), "دعاء اليوم — دعاء طلب الثبات");
console.log("Title hook variants passed.");
