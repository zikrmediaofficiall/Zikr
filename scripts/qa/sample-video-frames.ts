// Private QA helper (run by hand, never in CI): npx tsx scripts/qa/sample-video-frames.ts <video.mp4> <canaryId> [out.json]
// Samples frames with ffmpeg, measures visual diversity and writes an immutable QA snapshot. Uploads and publishes nothing.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createQaSnapshot, measureFrameDiversity, type SampledFrame } from "../../src/features/videos/services/video-frame-diversity";

const [, , video, canaryId = "manual", out] = process.argv;
if (!video) { console.error("usage: sample-video-frames.ts <video> <canaryId> [out.json]"); process.exit(2); }
const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", video]).toString());
const count = Math.max(6, Math.min(24, Math.round(duration / 2)));
const frames: SampledFrame[] = [];
for (let i = 0; i < count; i++) {
  const t = Number(((duration * (i + 0.5)) / count).toFixed(2));
  const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", "scale=16:16,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 20 });
  frames.push({ timeSeconds: t, pixels: Array.from(raw) });
}
const snapshot = createQaSnapshot(canaryId, measureFrameDiversity(frames));
writeFileSync(out ?? `/tmp/${canaryId}-qa-snapshot.json`, JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify(snapshot.report), snapshot.digest);
