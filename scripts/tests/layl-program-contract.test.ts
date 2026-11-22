import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAYL_EPISODES, LAYL_PROGRAM_ID, LAYL_PROGRAM_TITLE, LAYL_VOICE_PROFILE, LAYL_VISUAL_THEME } from "../../src/features/videos/data/layl-program";
import { resolveRenderDuration, MAX_AUTO_VIDEO_SECONDS } from "../../src/features/videos/services/render-duration";
import { resolveVideoCatalogDuration } from "../../src/features/videos/services/video-render-contract";

assert.equal(LAYL_PROGRAM_ID, "dakitayn-ma3-layl");
assert.equal(LAYL_PROGRAM_TITLE, "دقيقتين مع ليل");
assert.equal(LAYL_VOICE_PROFILE, "egyptian_male_story");
assert.equal(LAYL_VISUAL_THEME, "layl");
assert.equal(LAYL_EPISODES.length, 8);

for (const episode of LAYL_EPISODES) {
  assert.ok(episode.title.trim().length >= 5, "each Layl episode needs a title");
  assert.ok(episode.script.length >= 300 && episode.script.length <= 2500, "episode script must fit the narration endpoint");
  assert.ok(/^https:\/\//.test(episode.referenceUrl), "each episode must expose an HTTPS source reference");
  assert.ok(episode.referenceLabel.trim().length >= 8, "each episode must name its religious/editorial source");
}

assert.equal(MAX_AUTO_VIDEO_SECONDS, 60, "normal ZIKR automated videos must keep their current 60-second limit");
assert.ok(Math.abs(resolveRenderDuration(90, 18, 120) - 90.8) < 0.001, "Layl narration should retain its full duration up to 120 seconds");
assert.throws(() => resolveRenderDuration(120, 18, 120), /120.0s > 120.0s max/, "Layl must reject speech that cannot fit its two-minute ceiling");
assert.throws(() => resolveRenderDuration(59.3, 20), /59.3s > 60.0s max/, "standard automated videos must remain capped at 60 seconds");
assert.equal(resolveVideoCatalogDuration(90.8, 120), 91, "the internal catalog must preserve the rounded Layl duration");
assert.throws(() => resolveVideoCatalogDuration(61), /no greater than 60 seconds/, "the catalog must continue rejecting standard videos over 60 seconds");

const api = readFileSync("src/app/api/admin/videos/create/route.ts", "utf8");
assert.ok(api.includes("LAYL_EPISODES, LAYL_PROGRAM_ID"), "the server route must import the canonical Layl episode contract");
assert.ok(api.includes('content.workflow === "layl-program"'), "the server must recognize only the dedicated Layl workflow");
assert.ok(api.includes("submittedContent.sourceUrl === episode?.referenceUrl"), "the server must pin each episode to its canonical reference");
assert.ok(api.includes('voiceProfile: "egyptian_male_story"'), "the server must choose the Egyptian male voice profile");
assert.ok(api.includes('visualTheme: "layl"'), "the server must choose the branded Layl mascot scene");
assert.ok(api.includes("maxDurationSeconds: 120"), "the server must explicitly authorize the dedicated two-minute ceiling");
assert.ok(api.includes("skipSocialPublish: true"), "Layl generation must not auto-publish to external social platforms");

const worker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.ok(worker.includes('request.content?.programId === "dakitayn-ma3-layl"'), "only the canonical Layl program ID may receive the extended duration");
assert.ok(worker.includes("resolveRenderDuration(audioDuration, TARGET_VIDEO_SECONDS, maxDurationSeconds)"), "the worker must apply the request-scoped duration contract");
assert.ok(worker.includes("assertPlayableOutput(outputPath, width, height, maxDurationSeconds, signal)"), "the final media probe must enforce the same duration ceiling");
assert.ok(worker.includes("requestedVisualTheme"), "the renderer must honor an allowed, server-pinned Layl theme");

const voice = readFileSync("scripts/generate-arabic-voice.py", "utf8");
assert.ok(voice.includes('voice.strip().lower().startswith("ar-eg-")'), "Egyptian neural voice requests must not silently fall back to generic Arabic");
assert.ok(voice.includes("generic Arabic fallback is disabled"), "the TTS fallback policy must fail clearly for the Egyptian voice");

const mascot = readFileSync("public/video/templates/layl.svg", "utf8");
assert.ok(mascot.includes("public"), "mascot template must be a valid local text SVG");
assert.ok(mascot.includes("../../icons/icon-512.png"), "the only explicit watermark source must be the original ZIKR app icon");

const panel = readFileSync("src/features/admin/video-studio/components/layl-program-panel.tsx", "utf8");
const studio = readFileSync("src/features/admin/video-studio/components/admin-video-studio-client.tsx", "utf8");
assert.ok(panel.includes("/api/admin/videos/create"), "Layl must submit into the existing production queue");
assert.ok(panel.includes("/api/admin/video-generation"), "Layl must read its actual production queue");
assert.ok(panel.includes("/icons/icon-512.png"), "the admin panel must show the actual ZIKR app icon");
assert.ok(studio.includes("<LaylProgramPanel />"), "the Layl program panel must be mounted in the site/mobile admin studio");
assert.ok(!panel.includes('contentFormat: "series_episode"'), "general-audience Layl videos must not be misclassified by the Kids audience contract");

console.log("Layl program factory contract tests passed.");
