#!/usr/bin/env node
/**
 * ZIKR — free local video upscaling.
 *
 * Why this exists: Google Flow renders a free 720p clip but charges an upgrade
 * (Pro) for its 1080p and 4K downloads. The same 720p master can be upscaled
 * locally with FFmpeg at no cost, so no paid upscale is ever required.
 *
 * Honest limit: upscaling adds pixels, not detail. It is for meeting a
 * platform's resolution spec (YouTube/Reels accept 1080p) and for smoother
 * scaling than a player-side stretch. It is not a substitute for a native
 * 1080p render when real detail matters.
 *
 * Usage:
 *   node scripts/upscale-video.mjs --input clip.mp4 --output clip-1080.mp4 --target 1080
 *   node scripts/upscale-video.mjs --input clip.mp4 --output out.mp4 --target 2160 --crf 17 --sharpen 0.8
 *   node scripts/upscale-video.mjs --input clip.mp4 --output out.mp4 --target 1080 --dry-run
 *
 * Exit codes: 0 = upscaled or intentionally skipped, 1 = error.
 * Nothing is written in place: the input file is never modified.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const SUPPORTED_TARGETS = Object.freeze({ 720: 720, 1080: 1080, 1440: 1440, 2160: 2160 });

/** Audio codecs that can be stream-copied into an MP4 container. */
const MP4_AUDIO_COPY_CODECS = new Set(["aac", "mp3", "alac"]);

const FFMPEG = process.env.ZIKR_FFMPEG?.trim() || "ffmpeg";
const FFPROBE = process.env.ZIKR_FFPROBE?.trim() || "ffprobe";

export function resolveTargetHeight(value) {
  if (value === undefined || value === null || value === "") {
    throw new Error("--target is required (720, 1080, 1440, 2160, or any even pixel height).");
  }
  const height = Number(value);
  if (!Number.isFinite(height) || !Number.isInteger(height) || height < 240 || height > 4320) {
    throw new Error(`Unsupported target height: ${value}. Use 720, 1080, 1440, 2160, or an even height from 240 to 4320.`);
  }
  if (height % 2 !== 0) {
    throw new Error(`Target height must be even for 4:2:0 output, got ${height}.`);
  }
  return height;
}

/**
 * Lanczos keeps edges cleaner than bilinear when enlarging, and a light unsharp
 * pass restores the micro-contrast that scaling softens. Sharpen is applied to
 * luma only so colour does not ring.
 */
export function buildScaleFilter(targetHeight, sharpen = 0.6) {
  const amount = Number(sharpen);
  if (!Number.isFinite(amount) || amount < 0 || amount > 2) {
    throw new Error(`--sharpen must be between 0 and 2, got ${sharpen}.`);
  }
  const scale = `scale=-2:${targetHeight}:flags=lanczos`;
  if (amount === 0) return scale;
  return `${scale},unsharp=5:5:${amount}:5:5:0`;
}

export function decideAction({ sourceHeight, targetHeight, force = false }) {
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new Error("The source video height could not be read; refusing to guess.");
  }
  if (!force && sourceHeight >= targetHeight) {
    return {
      action: "skip",
      reason: `source is already ${sourceHeight}p, at or above the ${targetHeight}p target`,
    };
  }
  return { action: "upscale", reason: `${sourceHeight}p -> ${targetHeight}p` };
}

export function buildFfmpegArgs({
  input,
  output,
  targetHeight,
  crf = 18,
  preset = "medium",
  sharpen = 0.6,
  audioCodec = null,
  hasAudio = false,
}) {
  const filter = buildScaleFilter(targetHeight, sharpen);
  const audioArgs = !hasAudio
    ? ["-an"]
    : MP4_AUDIO_COPY_CODECS.has(String(audioCodec || "").toLowerCase())
      ? ["-c:a", "copy"]
      : ["-c:a", "aac", "-b:a", "192k", "-ac", "2"];

  return [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-i", input,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", String(preset),
    "-crf", String(crf),
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-movflags", "+faststart",
    ...audioArgs,
    "-max_muxing_queue_size", "1024",
    output,
  ];
}

export function probe(file) {
  const result = spawnSync(FFPROBE, [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    "-show_format",
    file,
  ], { encoding: "utf8" });

  if (result.error) {
    throw new Error(`ffprobe could not run (${result.error.message}). Install FFmpeg or set ZIKR_FFPROBE.`);
  }
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${file}: ${(result.stderr || "").trim()}`);
  }

  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    throw new Error(`ffprobe returned unreadable JSON for ${file}.`);
  }

  const streams = Array.isArray(data.streams) ? data.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");

  return {
    width: Number(video?.width) || null,
    height: Number(video?.height) || null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    hasAudio: Boolean(audio),
    durationSeconds: Number(data.format?.duration ?? video?.duration) || 0,
    sizeBytes: Number(data.format?.size) || 0,
    bitRate: Number(data.format?.bit_rate) || 0,
  };
}

export function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
    target: null,
    crf: 18,
    preset: "medium",
    sharpen: 0.6,
    force: false,
    dryRun: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} needs a value.`);
      index += 1;
      return value;
    };

    switch (arg) {
      case "--input": options.input = next(); break;
      case "--output": options.output = next(); break;
      case "--target": options.target = next(); break;
      case "--crf": options.crf = Number(next()); break;
      case "--preset": options.preset = next(); break;
      case "--sharpen": options.sharpen = Number(next()); break;
      case "--force": options.force = true; break;
      case "--dry-run": options.dryRun = true; break;
      case "--json": options.json = true; break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

const HELP = `ZIKR free video upscaler

  node scripts/upscale-video.mjs --input <file> --output <file> --target <720|1080|1440|2160>

Options:
  --crf <n>        x264 quality, lower is better (default 18)
  --preset <name>  x264 speed/size trade-off (default medium)
  --sharpen <n>    luma unsharp amount 0-2 (default 0.6)
  --force          upscale even when the source is already at or above the target
  --dry-run        print the FFmpeg command without running it
  --json           print a machine-readable summary
  --help           show this help

Cost: zero. Runs locally; no upload, no credits, no subscription.
`;

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`upscale-video: ${error.message}`);
    return 1;
  }

  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const emit = (payload) => {
    if (options.json) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return;
    }
    const lines = Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    process.stdout.write(`${lines.join("\n")}\n`);
  };

  try {
    if (!options.input) throw new Error("--input is required.");
    if (!options.output) throw new Error("--output is required.");

    const input = resolve(options.input);
    const output = resolve(options.output);
    if (!existsSync(input)) throw new Error(`Input not found: ${input}`);
    if (input === output) throw new Error("--output must differ from --input; the source is never overwritten.");

    const targetHeight = resolveTargetHeight(options.target);
    const source = probe(input);
    const decision = decideAction({ sourceHeight: source.height, targetHeight, force: options.force });

    if (decision.action === "skip") {
      emit({
        action: "skip",
        reason: decision.reason,
        input,
        sourceHeight: source.height,
        targetHeight,
      });
      return 0;
    }

    const outputDir = dirname(output);
    if (!existsSync(outputDir)) throw new Error(`Output directory does not exist: ${outputDir}`);

    const workDir = mkdtempSync(join(tmpdir(), "zikr-upscale-"));
    const tempOutput = join(workDir, "upscaled.mp4");
    const args = buildFfmpegArgs({
      input,
      output: tempOutput,
      targetHeight,
      crf: options.crf,
      preset: options.preset,
      sharpen: options.sharpen,
      audioCodec: source.audioCodec,
      hasAudio: source.hasAudio,
    });

    if (options.dryRun) {
      rmSync(workDir, { recursive: true, force: true });
      emit({ action: "dry-run", command: [FFMPEG, ...args].join(" ") });
      return 0;
    }

    const encode = spawnSync(FFMPEG, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    if (encode.error) {
      rmSync(workDir, { recursive: true, force: true });
      throw new Error(`ffmpeg could not run (${encode.error.message}). Install FFmpeg or set ZIKR_FFMPEG.`);
    }
    if (encode.status !== 0) {
      rmSync(workDir, { recursive: true, force: true });
      throw new Error(`ffmpeg failed: ${(encode.stderr || "").trim().split("\n").slice(-6).join(" | ")}`);
    }

    const encoded = probe(tempOutput);
    if (encoded.height !== targetHeight) {
      rmSync(workDir, { recursive: true, force: true });
      throw new Error(`Output height is ${encoded.height}, expected ${targetHeight}.`);
    }
    if (source.durationSeconds > 0 && Math.abs(encoded.durationSeconds - source.durationSeconds) > 1) {
      rmSync(workDir, { recursive: true, force: true });
      throw new Error(`Output duration ${encoded.durationSeconds}s does not match source ${source.durationSeconds}s.`);
    }
    if (source.hasAudio && !encoded.hasAudio) {
      rmSync(workDir, { recursive: true, force: true });
      throw new Error("The source has audio but the upscaled output does not.");
    }

    renameSync(tempOutput, output);
    rmSync(workDir, { recursive: true, force: true });

    emit({
      action: "upscaled",
      input,
      output,
      sourceHeight: source.height,
      targetHeight,
      outputWidth: encoded.width,
      outputHeight: encoded.height,
      outputBytes: statSync(output).size,
      durationSeconds: encoded.durationSeconds,
      audio: encoded.hasAudio ? (encoded.audioCodec || "copied") : "none",
      cost: "0",
    });
    return 0;
  } catch (error) {
    console.error(`upscale-video: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  process.exit(main(process.argv.slice(2)));
}
