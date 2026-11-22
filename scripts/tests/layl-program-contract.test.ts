import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAYL_EPISODES, LAYL_PROGRAM_ID, LAYL_PROGRAM_TITLE, LAYL_VOICE_PROFILE, LAYL_VISUAL_THEME } from "../../src/features/videos/data/layl-program";
import { resolveRenderDuration, MAX_AUTO_VIDEO_SECONDS } from "../../src/features/videos/services/render-duration";
import { isoWeekKey, resolveNextScheduledLaylEpisode } from "../../src/features/videos/services/layl-program-schedule";
import { resolveVideoCatalogDuration } from "../../src/features/videos/services/video-render-contract";

assert.equal(LAYL_PROGRAM_ID, "dakitayn-ma3-layl");
assert.equal(LAYL_PROGRAM_TITLE, "دقيقتين مع ليل");
assert.equal(LAYL_VOICE_PROFILE, "egyptian_male_story");
assert.equal(LAYL_VISUAL_THEME, "layl");
assert.equal(LAYL_EPISODES.length, 8);

const sundayWeek47 = new Date("2026-11-22T04:00:00.000Z");
const sundayWeek48 = new Date("2026-11-29T04:00:00.000Z");
const mondayWeek48 = new Date("2026-11-23T04:00:00.000Z");
assert.equal(isoWeekKey(sundayWeek47), "2026-W47");
assert.equal(isoWeekKey(sundayWeek48), "2026-W48");
assert.equal(resolveNextScheduledLaylEpisode(sundayWeek47, null)?.number, 1);
assert.equal(resolveNextScheduledLaylEpisode(mondayWeek48, null), null, "weekly Layl scheduling must only run on Sunday");
assert.equal(
  resolveNextScheduledLaylEpisode(sundayWeek47, { episodeNumber: 1, status: "completed", createdAt: "2026-11-22T01:00:00.000Z" }),
  null,
  "a completed episode must not be duplicated again in the same ISO week",
);
assert.equal(
  resolveNextScheduledLaylEpisode(sundayWeek48, { episodeNumber: 1, status: "completed", createdAt: "2026-11-22T01:00:00.000Z" })?.number,
  2,
  "the following Sunday may seed the next episode only after the previous episode completed",
);
assert.equal(
  resolveNextScheduledLaylEpisode(sundayWeek48, { episodeNumber: 1, status: "processing", createdAt: "2026-11-22T01:00:00.000Z" }),
  null,
  "a processing or failed previous episode must block advancing the weekly series",
);
assert.equal(
  resolveNextScheduledLaylEpisode(sundayWeek48, { episodeNumber: 8, status: "completed", createdAt: "2026-11-22T01:00:00.000Z" }),
  null,
  "the first season must stop after episode eight",
);

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
assert.ok(worker.includes('if (!isTemplatePreview && !isLaylProgram) aiPlan = await generateAiVideoPlan(request, signal);'), "Layl must not call Gemini for its fixed editorial script or planning");
assert.ok(worker.includes('      !isLaylProgram &&\n      !boundTemplate &&\n      engineConfig().aiEnabled &&'), "Layl must bypass external AI video providers and remain on the local branded renderer");

const voice = readFileSync("scripts/generate-arabic-voice.py", "utf8");
assert.ok(voice.includes('voice.strip().lower().startswith("ar-eg-")'), "Egyptian neural voice requests must not silently fall back to generic Arabic");
assert.ok(voice.includes("generic Arabic fallback is disabled"), "the TTS fallback policy must fail clearly for the Egyptian voice");
assert.ok(worker.includes("const ttsVoice = (isLaylProgram ? narrationProfile.voice"), "Layl must ignore a global non-Egyptian voice override");
assert.ok(worker.includes("const ttsRate = isLaylProgram ? narrationProfile.rate"), "Layl must use its own speech rate instead of a global override");
assert.ok(worker.includes('"--voice", ttsVoice'), "the generated narration must use the pinned Egyptian voice ID");
assert.ok(worker.includes("async function seedWeeklyLaylEpisodeRequest(now: Date)"), "the existing production worker must own weekly Layl scheduling");
assert.ok(worker.includes('const automationKey = "layl-weekly:season-1:" + week'), "weekly generation must use one canonical ISO-week idempotency key");
assert.ok(worker.includes("resolveNextScheduledLaylEpisode(now, latest)"), "the weekly worker must only advance after the last episode completed");
assert.ok(worker.includes('content->>seriesId=eq.'), "weekly scheduling must inspect the canonical program queue records");
assert.ok(worker.includes('skipSocialPublish: true'), "scheduled Layl episodes must remain internal until explicitly approved");
assert.ok(worker.includes('automation_key: automationKey'), "each scheduled Layl episode must use the canonical weekly key in the queue");

const mascot = readFileSync("public/video/templates/layl.svg", "utf8");
assert.ok(mascot.startsWith("<svg") && mascot.includes('viewBox="0 0 1080 1920"'), "mascot template must be a valid local vertical SVG");
assert.ok(mascot.includes("../../icons/icon-512.png"), "the only explicit watermark source must be the original ZIKR app icon");

const panel = readFileSync("src/features/admin/video-studio/components/layl-program-panel.tsx", "utf8");
const studio = readFileSync("src/features/admin/video-studio/components/admin-video-studio-client.tsx", "utf8");
assert.ok(panel.includes("/api/admin/videos/create"), "Layl must submit into the existing production queue");
assert.ok(panel.includes("/api/admin/video-generation"), "Layl must read its actual production queue");
assert.ok(panel.includes("/icons/icon-512.png"), "the admin panel must show the actual ZIKR app icon");
assert.ok(studio.includes("<LaylProgramPanel />"), "the Layl program panel must be mounted in the site/mobile admin studio");
assert.ok(!panel.includes('contentFormat: "series_episode"'), "general-audience Layl videos must not be misclassified by the Kids audience contract");

console.log("Layl program factory contract tests passed.");
