import { createHash } from "node:crypto";

/** A sampled frame reduced to a small grayscale grid (values 0-255). */
export type SampledFrame = { timeSeconds: number; pixels: number[] };

export type FrameDiversityReport = {
  frameCount: number;
  meanAdjacentDifference: number;
  minAdjacentDifference: number;
  nearDuplicateFrames: number;
  blankFrames: number;
  meanBrightness: number;
  passed: boolean;
  reasons: string[];
};

export const FRAME_DIVERSITY_LIMITS = {
  minFrames: 4,
  /** Adjacent frames closer than this (0-1 scale) count as near duplicates. */
  nearDuplicateBelow: 0.004,
  /** A frame whose pixel spread is below this is blank or a flat colour. */
  blankSpreadBelow: 6,
  maxNearDuplicateRatio: 0.5,
  maxBlankFrames: 0,
  minMeanAdjacentDifference: 0.01,
} as const;

function difference(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n / 255;
}

function spread(pixels: number[]): number {
  if (pixels.length === 0) return 0;
  // 10th to 90th percentile, so a few edge pixels from scaling cannot make a flat frame look varied.
  const sorted = [...pixels].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.9)] - sorted[Math.floor(sorted.length * 0.1)];
}

/** Measures how much a rendered video really changes between sampled frames. */
export function measureFrameDiversity(frames: SampledFrame[]): FrameDiversityReport {
  const L = FRAME_DIVERSITY_LIMITS;
  const reasons: string[] = [];
  const diffs: number[] = [];
  for (let i = 1; i < frames.length; i++) diffs.push(difference(frames[i - 1].pixels, frames[i].pixels));
  const blankFrames = frames.filter((f) => spread(f.pixels) < L.blankSpreadBelow).length;
  const nearDuplicateFrames = diffs.filter((d) => d < L.nearDuplicateBelow).length;
  const mean = diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  const min = diffs.length ? Math.min(...diffs) : 0;
  const brightness = frames.length
    ? frames.reduce((s, f) => s + (f.pixels.length ? f.pixels.reduce((x, y) => x + y, 0) / f.pixels.length : 0), 0) / frames.length
    : 0;
  if (frames.length < L.minFrames) reasons.push(`only ${frames.length} frames sampled, need ${L.minFrames}`);
  if (blankFrames > L.maxBlankFrames) reasons.push(`${blankFrames} blank frames`);
  if (diffs.length && nearDuplicateFrames / diffs.length > L.maxNearDuplicateRatio) reasons.push("most adjacent frames are near duplicates");
  if (diffs.length && mean < L.minMeanAdjacentDifference) reasons.push("video barely changes over time");
  return {
    frameCount: frames.length,
    meanAdjacentDifference: Number(mean.toFixed(4)),
    minAdjacentDifference: Number(min.toFixed(4)),
    nearDuplicateFrames,
    blankFrames,
    meanBrightness: Number(brightness.toFixed(2)),
    passed: reasons.length === 0,
    reasons,
  };
}

export type QaSnapshot = { canaryId: string; createdAt: string; report: FrameDiversityReport; digest: string };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Immutable snapshot: the digest covers canary id, time and report, so later edits are detectable. */
export function createQaSnapshot(canaryId: string, report: FrameDiversityReport, createdAt = new Date().toISOString()): QaSnapshot {
  const digest = createHash("sha256").update(canonical({ canaryId, createdAt, report })).digest("hex");
  return { canaryId, createdAt, report, digest };
}

export function verifyQaSnapshot(snapshot: QaSnapshot): boolean {
  return createQaSnapshot(snapshot.canaryId, snapshot.report, snapshot.createdAt).digest === snapshot.digest;
}
