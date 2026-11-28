import assert from "node:assert/strict";
import { FLY_SKIES, FLY_CONSTELLATIONS, getFlySky } from "../../src/features/kids/components/games/fly-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getFlySky(level));
assert.equal(seen.size, FLY_SKIES.length, "30 levels must cross every sky");
assert.equal(getFlySky(0), "dusk");
assert.equal(getFlySky(29), "dawn");
for (const star of FLY_CONSTELLATIONS.flat()) assert.ok(star[0] >= 0 && star[0] <= 100 && star[1] >= 0 && star[1] <= 100, "constellation point out of view");
console.log("Fly scene contract passed: " + seen.size + " skies, " + FLY_CONSTELLATIONS.length + " constellations.");
