import assert from "node:assert/strict";
import { VERSE_THEMES, getVerseTheme, litBeads, verseColors } from "../../src/features/kids/components/games/verse-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getVerseTheme(level));
assert.equal(seen.size, VERSE_THEMES.length, "30 levels must reach every bead style");
assert.equal(new Set(VERSE_THEMES.map(t => verseColors(t).string)).size, VERSE_THEMES.length);
assert.deepEqual(litBeads(4, 2), [true, true, false, false]);
assert.deepEqual(litBeads(3, 9), [true, true, true]);
assert.equal(litBeads(0, 0).length, 0);
console.log("Verse scene contract passed: " + seen.size + " bead styles. Visual only, verse text untouched.");
