import assert from "node:assert/strict";
import { DEFAULT_BRAND_COLORS, THEME_PRESETS, buildThemeCss, contrastRatio, parseSiteExperience, validateColors } from "../../src/lib/omnis/site-experience";

assert.deepEqual(validateColors(DEFAULT_BRAND_COLORS), []);
assert.equal(buildThemeCss(null), "");
for (const p of Object.values(THEME_PRESETS)) assert.deepEqual(validateColors(p.colors), []);
assert.ok(validateColors({ ...DEFAULT_BRAND_COLORS, cream: "#333333" }).length > 0);
assert.ok(validateColors({ ...DEFAULT_BRAND_COLORS, gold: "red" }).length > 0);
assert.ok(Math.abs(contrastRatio("#000000", "#FFFFFF") - 21) < 0.1);
const parsed = parseSiteExperience({
  colors: { gold: "red;}body{display:none", emerald: "#12365A", emeraldDeep: "#0A2038" },
  labels: { "/quran": { ar: "قرآن", en: "<b>x</b>" }, "bad path": { ar: "x" }, "/kids": { ar: "http://evil" } },
});
assert.equal(parsed.colors?.gold, DEFAULT_BRAND_COLORS.gold);
assert.match(buildThemeCss(parsed.colors), /^:root\{[-a-zA-Z0-9:#;]+\}$/);
assert.deepEqual(parsed.labels, { "/quran": { ar: "قرآن" } });
assert.equal(parseSiteExperience({ colors: { cream: "#444444" } }).colors, null);
console.log("site-experience tests passed");
