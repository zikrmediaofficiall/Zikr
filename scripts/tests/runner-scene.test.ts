import assert from "node:assert/strict";
import { RUNNER_LEVELS } from "../../src/lib/games/zikr-runner";
import { RUNNER_SCENE_PALETTES } from "../../src/features/kids/components/games/runner-scene";

const themes = new Set(RUNNER_LEVELS.map(level => level.theme));
assert.ok(themes.size >= 6, "runner levels must use at least six themes");
for (const theme of themes) {
  assert.ok(RUNNER_SCENE_PALETTES[theme], "missing runner scene palette for " + theme);
}
const skies = new Set(Object.values(RUNNER_SCENE_PALETTES).map(palette => palette.sky));
assert.equal(skies.size, Object.keys(RUNNER_SCENE_PALETTES).length, "every runner theme needs its own sky");
console.log("Runner scene contract passed: " + themes.size + " distinct themed scenes.");
