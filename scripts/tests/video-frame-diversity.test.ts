import assert from "node:assert/strict";
import {
  createQaSnapshot,
  isVideoMediaFactsValid,
  measureFrameDiversity,
  parseVolumeDetectOutput,
  verifyQaSnapshot,
  VIDEO_FRAME_DIVERSITY_ENGINE,
  VIDEO_FRAME_DIVERSITY_VERSION,
  type SampledFrame,
  type VideoMediaFacts,
} from "../../src/features/videos/services/video-frame-diversity";

const grid = (fn: (index: number) => number) => Array.from({ length: 256 }, (_, index) => fn(index));
const frame = (timeSeconds: number, pixel: (index: number) => number): SampledFrame => ({
  timeSeconds,
  pixels: grid(pixel),
});
const varied = [0, 1, 2, 3, 4, 5].map((index) => frame(index, (pixel) => ((pixel * (index + 3)) + index * 40) % 256));
assert.equal(measureFrameDiversity(varied).passed, true);

const flat = Array.from({ length: 6 }, (_, index) => frame(index, () => 10));
const blankReport = measureFrameDiversity(flat);
assert.equal(blankReport.passed, false);
assert.equal(blankReport.blankFrames, 6);
assert.ok(blankReport.reasons.some((reason) => reason.includes("flat or blank")));

const black = Array.from({ length: 6 }, (_, index) => frame(index, () => index % 2));
const blackReport = measureFrameDiversity(black);
assert.equal(blackReport.passed, false);
assert.equal(blackReport.blackFrames, 6);

const frozen = Array.from({ length: 6 }, (_, index) => frame(index, (pixel) => (pixel * 7) % 256));
const frozenReport = measureFrameDiversity(frozen);
assert.equal(frozenReport.passed, false);
assert.ok(frozenReport.reasons.some((reason) => reason.includes("near duplicates")));

assert.equal(measureFrameDiversity(varied.slice(0, 2)).passed, false, "too few frames fails");
assert.equal(measureFrameDiversity([{ timeSeconds: 0, pixels: [1, 2] }, ...varied.slice(1)]).passed, false, "malformed frames fail");
assert.equal(
  measureFrameDiversity([frame(2, () => 50), frame(1, () => 70), ...varied.slice(2)]).passed,
  false,
  "sample timestamps must increase",
);

const parsedLevels = parseVolumeDetectOutput("video:0kB audio:12kB mean_volume: -21.4 dB max_volume: -2.7 dB");
assert.deepEqual(parsedLevels, { meanVolumeDb: -21.4, peakVolumeDb: -2.7 });
assert.equal(parseVolumeDetectOutput("mean_volume: -inf dB max_volume: -inf dB"), null, "silent tracks fail closed");
assert.equal(parseVolumeDetectOutput("no audio statistics"), null);

const facts: VideoMediaFacts = {
  videoCodec: "h264",
  audioCodec: "aac",
  width: 1080,
  height: 1920,
  frameRate: 30,
  durationSeconds: 12,
  sizeBytes: 4_000_000,
  audioMeanVolumeDb: -24,
  audioPeakVolumeDb: -2,
  containerFormat: "mov,mp4,m4a,3gp,3g2,mj2",
};
assert.equal(isVideoMediaFactsValid(facts), true);
assert.equal(isVideoMediaFactsValid({ ...facts, audioCodec: "mp3" }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, width: 320 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, frameRate: 120 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, sizeBytes: 0 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, sizeBytes: 60 * 1024 * 1024 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, durationSeconds: 136 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, containerFormat: "matroska,webm" }), false, "non-MP4/MOV containers fail closed");
assert.equal(isVideoMediaFactsValid({ ...facts, audioMeanVolumeDb: -70 }), false);
assert.equal(isVideoMediaFactsValid({ ...facts, audioPeakVolumeDb: 0 }), false, "clipped peaks fail QA");

const snapshot = createQaSnapshot("canary-1", measureFrameDiversity(varied), "2026-11-28T00:00:00.000Z", facts);
assert.equal(verifyQaSnapshot(snapshot), true);
assert.equal(snapshot.engine, VIDEO_FRAME_DIVERSITY_ENGINE);
assert.equal(snapshot.version, VIDEO_FRAME_DIVERSITY_VERSION);
assert.equal(verifyQaSnapshot({ ...snapshot, version: "2026-11-28-p08-v0" }), false, "version is bound to the checksum");
assert.equal(verifyQaSnapshot({ ...snapshot, report: { ...snapshot.report, passed: false } }), false);
assert.equal(verifyQaSnapshot({ ...snapshot, media: { ...facts, width: 320 } }), false, "tampering with media facts is detected");
assert.equal(verifyQaSnapshot({ ...snapshot, digest: "not-a-sha256" }), false);
assert.throws(() => createQaSnapshot("", measureFrameDiversity(varied)), /canary ID/);
assert.throws(() => createQaSnapshot("x", measureFrameDiversity(varied), "not-a-date"), /timestamp/);

console.log("P08 technical probe, frame-diversity and QA snapshot contracts passed.");
