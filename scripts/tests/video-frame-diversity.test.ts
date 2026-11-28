import assert from "node:assert/strict";
import { createQaSnapshot, measureFrameDiversity, verifyQaSnapshot, type SampledFrame } from "../../src/features/videos/services/video-frame-diversity";

const grid = (fn: (i: number) => number) => Array.from({ length: 256 }, (_, i) => fn(i));
const frame = (t: number, fn: (i: number) => number): SampledFrame => ({ timeSeconds: t, pixels: grid(fn) });

const varied = [0, 1, 2, 3, 4, 5].map((k) => frame(k, (i) => ((i * (k + 3)) + k * 40) % 256));
const ok = measureFrameDiversity(varied);
assert.equal(ok.passed, true, ok.reasons.join(","));

const flat = Array.from({ length: 6 }, (_, k) => frame(k, () => 10));
const bad = measureFrameDiversity(flat);
assert.equal(bad.passed, false);
assert.equal(bad.blankFrames, 6);

const frozen = Array.from({ length: 6 }, (_, k) => frame(k, (i) => (i * 7) % 256));
const f = measureFrameDiversity(frozen);
assert.equal(f.passed, false);
assert.ok(f.reasons.some((r) => r.includes("near duplicates")));

assert.equal(measureFrameDiversity(varied.slice(0, 2)).passed, false, "too few frames fails");

const snap = createQaSnapshot("canary-1", ok, "2026-11-28T00:00:00.000Z");
assert.equal(verifyQaSnapshot(snap), true);
assert.equal(verifyQaSnapshot({ ...snap, report: { ...snap.report, passed: false } }), false, "edited snapshot is detected");
console.log("Frame diversity and immutable QA snapshot contracts passed.");
