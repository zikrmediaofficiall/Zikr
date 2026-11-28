import assert from "node:assert/strict";
import { ROAD_THEMES, getRoadTheme, roadLaneLeft, roadScale } from "../../src/features/kids/components/games/road-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getRoadTheme(level));
assert.equal(seen.size, ROAD_THEMES.length, "30 levels must pass through every road theme");
assert.ok(Math.abs(roadScale(82) - 1) < 0.001, "player line has scale 1");
assert.ok(roadScale(10) < roadScale(80), "objects shrink toward the horizon");
assert.equal(Math.round(roadLaneLeft(1, 30)), 50, "middle lane stays centered at any depth");
assert.ok(roadLaneLeft(0, 82) < 50 && roadLaneLeft(2, 82) > 50, "side lanes sit left and right of center");
assert.ok(Math.abs(roadLaneLeft(0, 82) - 16.5) < 0.01, "lane layout at the player line matches the original lane positions");
console.log("Road scene contract passed: " + seen.size + " themes, perspective lanes consistent.");
