import assert from "node:assert/strict";
import { WUDU_THEMES, getWuduTheme, mistakeDrops, waterPercent, wuduColors } from "../../src/features/kids/components/games/wudu-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getWuduTheme(level));
assert.equal(seen.size, WUDU_THEMES.length, "30 levels must reach every vessel");
assert.equal(new Set(WUDU_THEMES.map(t => wuduColors(t).vessel)).size, WUDU_THEMES.length);
assert.equal(waterPercent(0, 5), 0);
assert.equal(waterPercent(5, 5), 100);
assert.equal(waterPercent(9, 5), 100);
assert.equal(waterPercent(1, 0), 0);
assert.equal(mistakeDrops(2), 2);
assert.equal(mistakeDrops(40), 5);
console.log("Wudu scene contract passed: " + seen.size + " vessels, water meter and mistake drops. Steps text untouched.");
