// Private QA helper (run manually on a private canary; never uploads or publishes).
// Usage: pnpm tsx scripts/qa/sample-video-frames.ts <video.mp4> <safe-canary-id> [out.json]
import { execFileSync, spawnSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";
import {
  createQaSnapshot,
  isVideoMediaFactsValid,
  measureFrameDiversity,
  parseVolumeDetectOutput,
  type SampledFrame,
  type VideoMediaFacts,
} from "../../src/features/videos/services/video-frame-diversity";

const [, , video, canaryId = "manual", out] = process.argv;
if (!video || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(canaryId)) {
  console.error("usage: sample-video-frames.ts <video.mp4> <canaryId> [out.json]");
  process.exit(2);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const file = statSync(video);
if (!file.isFile() || file.size < 1024) fail("Input must be a non-empty local video file of at least 1 KiB.");

const probe = JSON.parse(execFileSync("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,avg_frame_rate",
  "-of", "json",
  video,
], { maxBuffer: 2 * 1024 * 1024 }).toString("utf8")) as {
  format?: { duration?: string; size?: string; format_name?: string };
  streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string }>;
};
const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
const audioStream = probe.streams?.find((stream) => stream.codec_type === "audio");
const frameRateParts = String(videoStream?.avg_frame_rate ?? "0/1").split("/");
const frameRateNumerator = Number(frameRateParts[0]);
const frameRateDenominator = Number(frameRateParts[1]);
const durationSeconds = Number(probe.format?.duration);
const sizeBytes = Number(probe.format?.size ?? file.size);
const facts: VideoMediaFacts = {
  videoCodec: String(videoStream?.codec_name ?? ""),
  audioCodec: String(audioStream?.codec_name ?? ""),
  width: Number(videoStream?.width ?? 0),
  height: Number(videoStream?.height ?? 0),
  frameRate: frameRateDenominator > 0 ? frameRateNumerator / frameRateDenominator : 0,
  durationSeconds,
  sizeBytes,
  audioMeanVolumeDb: Number.NaN,
  audioPeakVolumeDb: Number.NaN,
  containerFormat: String(probe.format?.format_name ?? ""),
};
const volumeProbe = spawnSync("ffmpeg", [
  "-hide_banner", "-nostats", "-i", video, "-vn", "-af", "volumedetect", "-f", "null", "-",
], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
if (volumeProbe.error || volumeProbe.status !== 0) fail("Audio loudness probe could not decode the complete input audio stream.");
const volumeLevels = parseVolumeDetectOutput(String(volumeProbe.stderr ?? ""));
if (!volumeLevels) fail("Audio loudness probe did not return finite mean and peak volume measurements.");
facts.audioMeanVolumeDb = volumeLevels.meanVolumeDb;
facts.audioPeakVolumeDb = volumeLevels.peakVolumeDb;
if (!isVideoMediaFactsValid(facts)) {
  fail("Technical QA failed: expected H.264 video, AAC audio, 720p+, 15–60 FPS, positive media size/duration, mean audio above -55 dB and peak below -0.1 dBFS.");
}

const count = Math.max(6, Math.min(24, Math.round(durationSeconds / 2)));
const frames: SampledFrame[] = [];
for (let index = 0; index < count; index++) {
  const timestamp = Number(((durationSeconds * (index + 0.5)) / count).toFixed(2));
  const raw = execFileSync("ffmpeg", [
    "-v", "error",
    "-ss", String(timestamp),
    "-i", video,
    "-frames:v", "1",
    "-vf", "scale=16:16:force_original_aspect_ratio=decrease,pad=16:16:(ow-iw)/2:(oh-ih)/2,format=gray",
    "-f", "rawvideo",
    "-",
  ], { maxBuffer: 1024 * 1024 });
  if (raw.byteLength !== 256) fail(`Frame sampling failed at ${timestamp}s: expected 256 grayscale pixels, received ${raw.byteLength}.`);
  frames.push({ timeSeconds: timestamp, pixels: Array.from(raw) });
}

const report = measureFrameDiversity(frames);
const snapshot = createQaSnapshot(canaryId, report, new Date().toISOString(), facts);
const destination = out ?? `/tmp/${canaryId}-qa-snapshot.json`;
writeFileSync(destination, JSON.stringify(snapshot, null, 2), { flag: "wx" });
console.log(JSON.stringify({ technical: facts, diversity: report, snapshotDigest: snapshot.digest, output: destination }, null, 2));
if (!report.passed) process.exitCode = 1;
