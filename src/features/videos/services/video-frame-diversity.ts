import { createHash } from "node:crypto";

export type SampledFrame = { timeSeconds: number; pixels: number[] };

export type FrameDiversityReport = {
  frameCount: number;
  meanAdjacentDifference: number;
  minAdjacentDifference: number;
  nearDuplicateFrames: number;
  blankFrames: number;
  blackFrames: number;
  invalidFrames: number;
  meanBrightness: number;
  passed: boolean;
  reasons: string[];
};

export type VideoMediaFacts = {
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  frameRate: number;
  durationSeconds: number;
  sizeBytes: number;
  audioMeanVolumeDb: number;
  audioPeakVolumeDb: number;
};

export const FRAME_DIVERSITY_LIMITS = {
  minFrames: 4,
  nearDuplicateBelow: 0.004,
  blankSpreadBelow: 6,
  blackMeanBelow: 8,
  maxNearDuplicateRatio: 0.5,
  maxBlankFrames: 0,
  maxBlackFrames: 0,
  minMeanAdjacentDifference: 0.01,
  expectedPixelsPerFrame: 256,
} as const;

function difference(a: number[], b: number[]): number {
  const n = FRAME_DIVERSITY_LIMITS.expectedPixelsPerFrame;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n / 255;
}

function spread(pixels: number[]): number {
  const sorted = [...pixels].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.8)] - sorted[Math.floor(sorted.length * 0.2)];
}

function frameIsValid(frame: SampledFrame): boolean {
  return Boolean(
    frame &&
    Number.isFinite(frame.timeSeconds) &&
    frame.timeSeconds >= 0 &&
    Array.isArray(frame.pixels) &&
    frame.pixels.length === FRAME_DIVERSITY_LIMITS.expectedPixelsPerFrame &&
    frame.pixels.every((value) => Number.isInteger(value) && value >= 0 && value <= 255),
  );
}

/** Measures blank/black frames and near-duplicate consecutive samples. */
export function measureFrameDiversity(frames: SampledFrame[]): FrameDiversityReport {
  const L = FRAME_DIVERSITY_LIMITS;
  const reasons: string[] = [];
  const invalidFrames = frames.filter((frame) => !frameIsValid(frame)).length;
  const validFrames = frames.filter(frameIsValid);

  if (frames.length < L.minFrames) reasons.push(`only ${frames.length} frames sampled, need ${L.minFrames}`);
  if (invalidFrames > 0) reasons.push(`${invalidFrames} malformed sampled frames`);
  for (let i = 1; i < validFrames.length; i++) {
    if (validFrames[i].timeSeconds <= validFrames[i - 1].timeSeconds) {
      reasons.push("sample timestamps must be strictly increasing");
      break;
    }
  }

  const blankFrames = validFrames.filter((frame) => spread(frame.pixels) < L.blankSpreadBelow).length;
  const blackFrames = validFrames.filter(
    (frame) => frame.pixels.reduce((sum, value) => sum + value, 0) / frame.pixels.length <= L.blackMeanBelow,
  ).length;
  const diffs: number[] = [];
  for (let i = 1; i < validFrames.length; i++) diffs.push(difference(validFrames[i - 1].pixels, validFrames[i].pixels));
  const nearDuplicateFrames = diffs.filter((value) => value < L.nearDuplicateBelow).length;
  const mean = diffs.length ? diffs.reduce((sum, value) => sum + value, 0) / diffs.length : 0;
  const min = diffs.length ? Math.min(...diffs) : 0;
  const brightness = validFrames.length
    ? validFrames.reduce(
        (sum, frame) => sum + frame.pixels.reduce((frameSum, value) => frameSum + value, 0) / frame.pixels.length,
        0,
      ) / validFrames.length
    : 0;

  if (blankFrames > L.maxBlankFrames) reasons.push(`${blankFrames} flat or blank frames`);
  if (blackFrames > L.maxBlackFrames) reasons.push(`${blackFrames} near-black frames`);
  if (diffs.length && nearDuplicateFrames / diffs.length > L.maxNearDuplicateRatio) {
    reasons.push("most adjacent frames are near duplicates");
  }
  if (diffs.length && mean < L.minMeanAdjacentDifference) reasons.push("video barely changes over time");

  return {
    frameCount: frames.length,
    meanAdjacentDifference: Number(mean.toFixed(4)),
    minAdjacentDifference: Number(min.toFixed(4)),
    nearDuplicateFrames,
    blankFrames,
    blackFrames,
    invalidFrames,
    meanBrightness: Number(brightness.toFixed(2)),
    passed: reasons.length === 0,
    reasons,
  };
}

export type QaSnapshot = {
  canaryId: string;
  createdAt: string;
  media: VideoMediaFacts | null;
  report: FrameDiversityReport;
  digest: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
    ).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? "null" : encoded;
}

/** SHA-256 binds the report and ffprobe facts; keep the digest outside the edited report for audit comparison. */
export function createQaSnapshot(
  canaryId: string,
  report: FrameDiversityReport,
  createdAt = new Date().toISOString(),
  media: VideoMediaFacts | null = null,
): QaSnapshot {
  if (typeof canaryId !== "string" || !canaryId.trim() || canaryId.length > 120) {
    throw new TypeError("A non-empty canary ID up to 120 characters is required.");
  }
  if (!Number.isFinite(Date.parse(createdAt))) throw new TypeError("QA snapshot timestamp is invalid.");
  const payload = { canaryId, createdAt, media, report };
  const digest = createHash("sha256").update(canonical(payload)).digest("hex");
  return { ...payload, digest };
}

export function verifyQaSnapshot(snapshot: QaSnapshot): boolean {
  try {
    if (
      !snapshot ||
      typeof snapshot !== "object" ||
      typeof snapshot.digest !== "string" ||
      !/^[a-f0-9]{64}$/.test(snapshot.digest)
    ) return false;
    return createQaSnapshot(snapshot.canaryId, snapshot.report, snapshot.createdAt, snapshot.media ?? null).digest === snapshot.digest;
  } catch {
    return false;
  }
}

export function isVideoMediaFactsValid(value: unknown): value is VideoMediaFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const facts = value as Record<string, unknown>;
  return (
    facts.videoCodec === "h264" &&
    facts.audioCodec === "aac" &&
    Number.isInteger(facts.width) && Number(facts.width) >= 720 &&
    Number.isInteger(facts.height) && Number(facts.height) >= 720 &&
    Number.isFinite(facts.frameRate) && Number(facts.frameRate) >= 15 && Number(facts.frameRate) <= 60 &&
    Number.isFinite(facts.durationSeconds) && Number(facts.durationSeconds) > 0 &&
    Number.isSafeInteger(facts.sizeBytes) && Number(facts.sizeBytes) > 0 &&
    Number.isFinite(facts.audioMeanVolumeDb) && Number(facts.audioMeanVolumeDb) > -55 &&
    Number.isFinite(facts.audioPeakVolumeDb) && Number(facts.audioPeakVolumeDb) < -0.1 &&
    Number(facts.audioMeanVolumeDb) <= Number(facts.audioPeakVolumeDb)
  );
}
