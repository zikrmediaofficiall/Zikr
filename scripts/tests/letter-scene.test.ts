import assert from "node:assert/strict";
import { LETTER_THEMES, flaskFills, getLetterTheme, letterColors } from "../../src/features/kids/components/games/letter-scene";

const seen = new Set<string>();
for (let round = 0; round < 8; round++) seen.add(getLetterTheme(round));
assert.equal(seen.size, LETTER_THEMES.length, "8 rounds must reach every bench style");
assert.equal(new Set(LETTER_THEMES.map(t => letterColors(t).tile)).size, LETTER_THEMES.length);
assert.deepEqual(flaskFills(4, 2), [1, 1, 0, 0]);
assert.equal(flaskFills(0, 0).length, 0);
console.log("Letter scene contract passed: " + seen.size + " bench styles, flasks fill per round.");
