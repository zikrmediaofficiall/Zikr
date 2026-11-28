import assert from "node:assert/strict";
import { MEMORY_THEMES, getMemoryTheme, memoryCardBack, memoryColumns } from "../../src/features/kids/components/games/memory-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getMemoryTheme(level));
assert.equal(seen.size, MEMORY_THEMES.length, "30 levels must reach every card style");
assert.equal(new Set(MEMORY_THEMES.map(t => memoryCardBack(t).back)).size, MEMORY_THEMES.length);
const shapes = new Set<number>();
for (let level = 0; level < 30; level++) for (const n of [6, 8, 10]) shapes.add(memoryColumns(level, n));
assert.ok(shapes.size >= 3, "board shapes vary");
console.log("Memory scene contract passed: " + seen.size + " card styles, " + shapes.size + " board shapes.");
