import assert from "node:assert/strict";
import {
  AUTOMATED_VIDEO_MODE_SEQUENCE,
  resolveAutomatedVideoMode,
} from "../../src/features/videos/services/video-content-distribution";

assert.equal(AUTOMATED_VIDEO_MODE_SEQUENCE.length, 14);
const counts = new Map<number, number>();
for (let slot = 0; slot < 14; slot += 1) {
  const mode = resolveAutomatedVideoMode(slot);
  counts.set(mode, (counts.get(mode) ?? 0) + 1);
  assert.equal(resolveAutomatedVideoMode(slot + 14), mode);
}
assert.deepEqual(
  [...counts.entries()].sort((a, b) => a[0] - b[0]),
  [[0, 4], [1, 2], [2, 3], [3, 1], [4, 1], [5, 2], [6, 1]],
);
assert.throws(() => resolveAutomatedVideoMode(-1), RangeError);
assert.throws(() => resolveAutomatedVideoMode(1.5), RangeError);
console.log("Video content distribution tests passed.");
