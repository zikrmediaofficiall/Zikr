import assert from "node:assert/strict";
import { GAME_VOICES, snapToScale } from "../../src/lib/games/tone-feedback";
import { GAME_REGISTRY } from "../../src/lib/games/registry";

const ids = Object.keys(GAME_REGISTRY ?? {});
assert.ok(ids.length >= 13, "registry should list the 13 games");
for (const id of ids) assert.ok(GAME_VOICES[id], "missing sound identity for " + id);
const signatures = new Set(Object.values(GAME_VOICES).map(v => [v.wave, v.pitch, v.scale.join(","), v.motif.join(",")].join("|")));
assert.equal(signatures.size, Object.keys(GAME_VOICES).length, "every game needs a distinct sound identity");
const motifs = new Set(Object.values(GAME_VOICES).map(v => v.motif.join(",")));
assert.equal(motifs.size, Object.keys(GAME_VOICES).length, "start motifs must be unique");
assert.ok(Math.abs(snapToScale(440, [0, 2, 4, 7, 9]) - 440) < 0.01, "A is in the pentatonic scale");
console.log("Game voice contract passed: " + signatures.size + " distinct synthesized sound identities.");
