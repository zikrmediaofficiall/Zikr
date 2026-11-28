import assert from "node:assert/strict";
import { JUMP_BIOMES, getJumpBiome, jumpBiomeColors } from "../../src/features/kids/components/games/jump-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getJumpBiome(level));
assert.equal(seen.size, JUMP_BIOMES.length, "30 levels must climb through every biome");
assert.equal(getJumpBiome(0), "valley");
assert.equal(getJumpBiome(29), "summit");
assert.equal(new Set(JUMP_BIOMES.map(b => jumpBiomeColors(b).sky)).size, JUMP_BIOMES.length, "each biome needs its own sky");
console.log("Jump scene contract passed: " + seen.size + " climbing biomes.");
