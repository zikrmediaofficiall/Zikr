import assert from "node:assert/strict";
import { ROOM_THEMES, dustSpotCount, getRoomTheme, roomColors } from "../../src/features/kids/components/games/room-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getRoomTheme(level));
assert.equal(seen.size, ROOM_THEMES.length, "30 levels must visit every room");
assert.equal(new Set(ROOM_THEMES.map(t => roomColors(t).floor)).size, ROOM_THEMES.length);
assert.equal(dustSpotCount(5, 0), 9, "untouched room is dusty");
assert.equal(dustSpotCount(5, 5), 0, "tidy room has no dust");
assert.ok(dustSpotCount(5, 2) < dustSpotCount(5, 1), "dust decreases as items are placed");
assert.equal(dustSpotCount(0, 0), 0);
console.log("Room scene contract passed: " + seen.size + " rooms, dust shrinks with tidying.");
