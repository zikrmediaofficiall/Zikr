import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/features/adhkar/components/adhkar-page.tsx", "utf8");

assert.match(source, /reward && dhikr\.sourceUrl/, "unreferenced virtue claims must not be displayed");
assert.match(source, /href=\{dhikr\.sourceUrl\}/, "a hadith source must be directly openable from the adhkar card");
assert.match(source, /https:\/\/sunnah\.com\/bukhari:6306/, "Sayyid al-Istighfar must link to its Bukhari reference");
assert.match(source, /https:\/\/sunnah\.com\/bukhari:6405/, "the 100-times tasbih virtue must link to its Bukhari reference");
assert.match(source, /https:\/\/sunnah\.com\/abudawud:5088/, "the morning/evening protection dhikr must link to its Abu Dawud reference");
assert.match(source, /https:\/\/sunnah\.com\/muslim:591/, "the post-prayer remembrance must link to Sahih Muslim");
assert.match(source, /https:\/\/sunnah\.com\/abudawud:1522/, "the dua for help with remembrance must link to Abu Dawud");
assert.match(source, /https:\/\/sunnah\.com\/tirmidhi:3377/, "the page-level hadith about remembrance must link to Tirmidhi");
assert.match(source, /target="_blank" rel="noopener noreferrer"/, "external references must open safely");

console.log("Adhkar source contract passed.");
