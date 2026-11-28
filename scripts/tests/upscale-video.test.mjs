import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildFfmpegArgs,
  buildScaleFilter,
  decideAction,
  parseArgs,
  probe,
  resolveTargetHeight,
} from "../upscale-video.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "upscale-video.mjs");
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0
  && spawnSync("ffprobe", ["-version"], { encoding: "utf8" }).status === 0;

test("target heights are validated", () => {
  assert.equal(resolveTargetHeight("1080"), 1080);
  assert.equal(resolveTargetHeight(2160), 2160);
  assert.throws(() => resolveTargetHeight("1081"), /even/);
  assert.throws(() => resolveTargetHeight("100"), /Unsupported/);
  assert.throws(() => resolveTargetHeight(undefined), /required/);
});

test("the scale filter uses lanczos and keeps the width even", () => {
  assert.equal(buildScaleFilter(1080, 0), "scale=-2:1080:flags=lanczos");
  assert.equal(buildScaleFilter(1080, 0.6), "scale=-2:1080:flags=lanczos,unsharp=5:5:0.6:5:5:0");
  assert.throws(() => buildScaleFilter(1080, 5), /between 0 and 2/);
});

test("a source already at the target is skipped unless forced", () => {
  assert.equal(decideAction({ sourceHeight: 1080, targetHeight: 1080 }).action, "skip");
  assert.equal(decideAction({ sourceHeight: 2160, targetHeight: 1080 }).action, "skip");
  assert.equal(decideAction({ sourceHeight: 720, targetHeight: 1080 }).action, "upscale");
  assert.equal(decideAction({ sourceHeight: 1080, targetHeight: 1080, force: true }).action, "upscale");
  assert.throws(() => decideAction({ sourceHeight: null, targetHeight: 1080 }), /could not be read/);
});

test("audio is stream-copied when the container supports it and transcoded otherwise", () => {
  const base = { input: "in.mp4", output: "out.mp4", targetHeight: 1080 };
  const copied = buildFfmpegArgs({ ...base, hasAudio: true, audioCodec: "aac" });
  assert.deepEqual(copied.slice(copied.indexOf("-c:a"), copied.indexOf("-c:a") + 2), ["-c:a", "copy"]);
  assert.equal(copied.includes("-movflags"), true, "faststart keeps the MP4 seekable on the web");

  const transcoded = buildFfmpegArgs({ ...base, hasAudio: true, audioCodec: "opus" });
  assert.deepEqual(transcoded.slice(transcoded.indexOf("-c:a"), transcoded.indexOf("-c:a") + 4), ["-c:a", "aac", "-b:a", "192k"]);

  const silent = buildFfmpegArgs({ ...base, hasAudio: false, audioCodec: null });
  assert.equal(silent.includes("-an"), true);
});

test("arguments parse and unknown flags fail loudly", () => {
  const options = parseArgs(["--input", "a.mp4", "--output", "b.mp4", "--target", "1080", "--json", "--dry-run"]);
  assert.equal(options.input, "a.mp4");
  assert.equal(options.target, "1080");
  assert.equal(options.json, true);
  assert.equal(options.dryRun, true);
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});

test("a real 720p clip is upscaled to 1080p with its audio intact", { skip: !hasFfmpeg && "ffmpeg is not installed" }, () => {
  const workDir = mkdtempSync(join(tmpdir(), "zikr-upscale-test-"));
  try {
    const source = join(workDir, "source-720.mp4");
    const output = join(workDir, "output-1080.mp4");

    const generated = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=24:duration=1",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-shortest", source,
    ], { encoding: "utf8" });
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(probe(source).height, 720);

    const run = spawnSync(process.execPath, [
      SCRIPT, "--input", source, "--output", output, "--target", "1080", "--preset", "ultrafast", "--json",
    ], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);

    const summary = JSON.parse(run.stdout);
    assert.equal(summary.action, "upscaled");
    assert.equal(summary.targetHeight, 1080);
    assert.equal(summary.cost, "0");

    const encoded = probe(output);
    assert.equal(encoded.height, 1080);
    assert.equal(encoded.width, 1920);
    assert.equal(encoded.hasAudio, true, "audio must survive the upscale");
    assert.ok(Math.abs(encoded.durationSeconds - 1) < 0.5);
    assert.ok(statSync(output).size > 0);

    // The source is never modified.
    assert.equal(probe(source).height, 720);
    assert.ok(existsSync(source));

    // Running again on the output is a no-op, not a second generation loss.
    const again = spawnSync(process.execPath, [
      SCRIPT, "--input", output, "--output", join(workDir, "again.mp4"), "--target", "1080", "--json",
    ], { encoding: "utf8" });
    assert.equal(again.status, 0, again.stderr);
    assert.equal(JSON.parse(again.stdout).action, "skip");
    assert.equal(existsSync(join(workDir, "again.mp4")), false, "a skipped run must not write a file");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});
