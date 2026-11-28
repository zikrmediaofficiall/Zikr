import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildVideoStoryboard,
  buildVideoStoryboardFilterGraph,
} from "../../src/features/videos/services/video-storyboard";

const general = buildVideoStoryboard({
  requestId: "request-quran-001",
  category: "quran",
  audience: "general",
  durationSeconds: 25,
  templateAssetKey: "manuscript-library",
});

assert.equal(general.version, "zikr-storyboard-v1");
assert.equal(general.scenes.length, 4);
assert.equal(general.scenes[0].assetKey, "manuscript-library", "Pinned Template Studio asset must lead the visual sequence.");
assert.equal(general.scenes[0].transitionIn, "none");
assert.ok(general.scenes.slice(1).every((scene) => scene.transitionIn === "fade"));
assert.ok(general.scenes.every((scene) => scene.assetKey !== ("kids-space" as never)), "General storyboards must never use Kids-only assets.");
assert.ok(Math.abs(
  general.scenes.at(-1)!.startSeconds + general.scenes.at(-1)!.durationSeconds - general.totalDurationSeconds,
) <= 0.002, "The storyboard timeline must exactly reconcile to the final render duration.");
assert.ok(general.scenes.every((scene) => scene.durationSeconds > general.overlapSeconds));
assert.deepEqual(
  buildVideoStoryboard({
    requestId: "request-quran-001",
    category: "quran",
    audience: "general",
    durationSeconds: 25,
    templateAssetKey: "manuscript-library",
  }),
  general,
  "Identical source IDs and template snapshots must produce a stable storyboard on retry.",
);

const kids = buildVideoStoryboard({
  requestId: "kids-episode-22",
  category: "story",
  audience: "kids",
  durationSeconds: 42,
  visualTheme: "kids-adventure",
});
assert.equal(kids.scenes.length, 5);
assert.ok(kids.scenes.every((scene) => scene.assetKey.startsWith("kids-")), "Kids storyboard scenes must use only Kids-approved artwork.");
assert.equal(kids.scenes[0].assetKey, "kids-adventure");

const short = buildVideoStoryboard({
  requestId: "short-video",
  category: "dua",
  audience: "general",
  durationSeconds: 1.25,
  visualTheme: "moonlit-sea",
});
assert.equal(short.scenes.length, 2);
assert.ok(Math.abs(short.scenes.at(-1)!.startSeconds + short.scenes.at(-1)!.durationSeconds - 1.25) <= 0.002);

assert.throws(() => buildVideoStoryboard({
  requestId: "wrong-audience",
  category: "quran",
  audience: "general",
  durationSeconds: 20,
  templateAssetKey: "kids-ocean" as never,
}), /audience-approved visual assets|approved audience catalogue/i);

assert.throws(() => buildVideoStoryboard({
  requestId: "invalid-duration",
  category: "story",
  audience: "general",
  durationSeconds: 0,
}), /duration must be between/i);

const graph = buildVideoStoryboardFilterGraph(general, 1080, 1920);
assert.equal((graph.match(/xfade=transition=fade/g) ?? []).length, general.scenes.length - 1);
assert.ok(graph.includes("[0:v]"));
assert.ok(graph.includes("[3:v]"));
assert.ok(graph.includes("[storyboard_v]"));
assert.ok(!graph.includes("drawtext"), "Arabic text is rendered only by the approved final caption renderer.");
assert.ok(!graph.includes("subtitles"), "Storyboard generation must remain visual-only.");
assert.throws(() => buildVideoStoryboardFilterGraph(general, 4096, 4096), /frame dimensions/i);

const worker = readFileSync(new URL("../jobs/template-video-automation.ts", import.meta.url), "utf8");
assert.ok(worker.includes("buildVideoStoryboard({"), "Normal template fallback renders must receive a deterministic storyboard.");
assert.ok(worker.includes("renderStoryboardBackground("), "Storyboard scenes must be composed by the existing FFmpeg worker.");
assert.ok(worker.includes("buildVideoStoryboardFilterGraph("), "FFmpeg xfade filters must come from the tested storyboard filter builder.");
assert.ok(worker.includes("makeAss(\n        text,"), "The exact approved narration remains the sole source for final captions.");
assert.ok(worker.includes("storyboard: storyboard ?"), "The stored render record must retain the applied storyboard plan.");
assert.ok(worker.includes("templateVersion"), "Storyboard renders must retain immutable Template Studio version metadata.");
console.log("Video storyboard timeline, audience safety, FFmpeg transitions, and caption-authority tests passed.");
