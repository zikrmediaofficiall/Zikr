import assert from "node:assert/strict";
import { MAP_THEMES, getMapTheme, mapColors } from "../../src/features/kids/components/games/map-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getMapTheme(level));
assert.equal(seen.size, MAP_THEMES.length, "30 levels must visit every part of the mosque grounds");
assert.equal(new Set(MAP_THEMES.map(t => mapColors(t).ground)).size, MAP_THEMES.length, "each map needs its own ground color");
console.log("Map scene contract passed: " + seen.size + " map themes.");
