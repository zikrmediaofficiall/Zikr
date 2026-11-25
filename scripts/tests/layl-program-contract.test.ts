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
assert.equal(new Set(LAYL_EPISODES.map((episode) => episode.visualBackground)).size, 8, "every episode must have its own topic-specific visual background");

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
assert.ok(api.includes("submittedContent.visualBackground === episode?.visualBackground"), "the API must reject a mismatched episode background");
assert.ok(api.includes("visualBackground: episode.visualBackground"), "the API must pin the canonical episode background server-side");
const approvalApi = readFileSync("src/app/api/admin/video-generation/route.ts", "utf8");
assert.ok(approvalApi.includes('if (currentContent.workflow === "layl-program" && currentContent.programId === LAYL_PROGRAM_ID)'), "only the approved Layl video may create a site publication queue item after human review");
assert.ok(approvalApi.includes('/rest/v1/content_publish_queue'), "the Layl approval endpoint must enqueue internal site publication only after approval");
assert.ok(approvalApi.includes('laylSitePublishQueueStatus = "queue_error"'), "post-approval queue errors must be returned as an explicit warning without masking the committed approval");
assert.ok(approvalApi.includes('laylSitePublishQueueStatus === "queue_error"'), "the approval response must surface a site queue warning when queue creation fails");
assert.ok(api.includes('visualTheme: "layl"'), "the server must choose the branded Layl mascot scene");
assert.ok(api.includes("maxDurationSeconds: 120"), "the server must explicitly authorize the dedicated two-minute ceiling");
assert.ok(api.includes("skipSocialPublish: true"), "Layl generation must not auto-publish to external social platforms");

const worker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.ok(worker.includes('request.content?.programId === "dakitayn-ma3-layl"'), "only the canonical Layl program ID may receive the extended duration");
assert.ok(worker.includes("resolveRenderDuration(audioDuration, TARGET_VIDEO_SECONDS, maxDurationSeconds)"), "the worker must apply the request-scoped duration contract");
assert.ok(worker.includes("assertPlayableOutput(outputPath, width, height, maxDurationSeconds, signal)"), "the final media probe must enforce the same duration ceiling");
assert.ok(worker.includes("requestedVisualTheme"), "the renderer must honor an allowed, server-pinned Layl theme");
assert.ok(worker.includes("episode.visualBackground === content.visualBackground"), "the QA gate must verify each episode's canonical topic background");
assert.ok(worker.includes("public/video/templates/layl-character.svg"), "all episode scenes must reuse the same approved Layl cartoon character layer");
assert.ok(worker.includes('request.content.workflow === "layl-program" && request.content.programId === LAYL_PROGRAM_ID'), "the Layl renderer must isolate the program from the generic publication flow");
assert.ok(worker.includes('return { videoId, published: false, queued: false }'), "Layl generation must keep the internal video unpublished and out of the site publication queue until approval");
assert.ok(worker.includes("overlay=0:0:format=auto"), "the renderer must composite Layl over the topic-specific local scene");
assert.ok(worker.includes("content.visualBackground"), "the renderer must select the background from the active episode's topic");

assert.ok(worker.includes('if (!isTemplatePreview && !isLaylProgram && !isHadyProgram && !isProphetStoryRequest) aiPlan = await generateAiVideoPlan(request, signal);'), "fixed Layl and Hady scripts and source-locked Prophet stories must not call Gemini for script planning");
assert.ok(worker.includes('      !isLaylProgram &&\n      !isHadyProgram &&\n      !isProphetStoryRequest &&\n      !boundTemplate &&\n      engineConfig().aiEnabled &&'), "Layl and Hady use branded local renderers and Prophet scenes remain source-locked, without external AI scene generation");

const voice = readFileSync("scripts/generate-arabic-voice.py", "utf8");
assert.ok(voice.includes('voice.strip().lower().startswith("ar-eg-")'), "Egyptian neural voice requests must not silently fall back to generic Arabic");
assert.ok(voice.includes("generic Arabic fallback is disabled"), "the TTS fallback policy must fail clearly for the Egyptian voice");
const generationWorkflow = readFileSync(".github/workflows/generate-ai-video.yml", "utf8");
assert.ok(generationWorkflow.includes('--voice "ar-EG-ShakirNeural"'), "the production worker must smoke-test the exact Egyptian male Layl voice before queue work");
assert.ok(generationWorkflow.includes('--rate="-7%"'), "the Egyptian voice smoke test must use Layl's pinned narration rate");
assert.ok(generationWorkflow.includes('--pitch="0Hz"'), "the Egyptian voice smoke test must use Layl's pinned pitch");
assert.ok(worker.includes("const ttsVoice = (isLaylProgram || isHadyProgram ? narrationProfile.voice"), "Layl and Hady must ignore global non-Egyptian voice overrides");
assert.ok(worker.includes("const ttsRate = isLaylProgram || isHadyProgram ? narrationProfile.rate"), "Layl and Hady must use their pinned narration rate instead of a global override");
assert.ok(worker.includes('"--voice", ttsVoice'), "the generated narration must use the pinned Egyptian voice ID");
assert.ok(worker.includes("async function seedWeeklyLaylEpisodeRequest(now: Date)"), "the existing production worker must own weekly Layl scheduling");
assert.ok(worker.includes('const automationKey = "layl-weekly:season-1:" + week'), "weekly generation must use one canonical ISO-week idempotency key");
assert.ok(worker.includes("resolveNextScheduledLaylEpisode(now, latest)"), "the weekly worker must only advance after the last episode completed");
assert.ok(worker.includes('content->>seriesId=eq.'), "weekly scheduling must inspect the canonical program queue records");
assert.ok(worker.includes('skipSocialPublish: true'), "scheduled Layl episodes must remain internal until explicitly approved");
assert.ok(worker.includes('automation_key: automationKey'), "each scheduled Layl episode must use the canonical weekly key in the queue");
assert.ok(worker.includes("const isVerifiedLaylEditorial = category === \"other\""), "the QA gate must recognize only the eight canonical Layl episode references");
assert.ok(worker.includes("episode.referenceLabel === sourceLabel"), "Layl source labels must match the canonical season references");
assert.ok(worker.includes("episode.referenceUrl === sourceUrl"), "Layl source URLs must match the canonical season references");
assert.ok(worker.includes("!isLaylProgram || voiceProfile === LAYL_VOICE_PROFILE"), "the audio QA gate must require the Egyptian male profile for Layl");
assert.ok(worker.includes("const maximumReviewedDuration = isLaylProgram ? 120 : isVerifiedHadyEditorial ? 135 : 60"), "the QA duration exception must be limited to verified Layl and Hady episodes");

const mascot = readFileSync("public/video/templates/layl.svg", "utf8");
const character = readFileSync("public/video/templates/layl-character.svg", "utf8");
assert.ok(character.includes('id="layl-character"'), "the transparent character foreground must retain the same presenter identity");
assert.ok(character.includes("../../icons/icon-512.png"), "the presenter foreground must use only the official ZIKR app watermark");
assert.ok(mascot.startsWith("<svg") && mascot.includes('viewBox="0 0 1080 1920"'), "mascot template must be a valid local vertical SVG");
assert.ok(mascot.includes('id="layl-character"'), "the program mascot must be the consistent cartoon young Egyptian presenter");
assert.ok(mascot.includes("../../icons/icon-512.png"), "the only explicit watermark source must be the original ZIKR app icon");

const panel = readFileSync("src/features/admin/video-studio/components/layl-program-panel.tsx", "utf8");
const studio = readFileSync("src/features/admin/video-studio/components/admin-video-studio-client.tsx", "utf8");
assert.ok(panel.includes("/api/admin/videos/create"), "Layl must submit into the existing production queue");
assert.ok(panel.includes("/api/admin/video-generation"), "Layl must read its actual production queue");
assert.ok(panel.includes("/video/templates/layl.svg"), "the admin panel must preview the actual Layl cartoon presenter");
assert.ok(panel.includes("visualBackground: activeEpisode.visualBackground"), "the admin panel must send the selected episode's visual background");
assert.ok(studio.includes("<LaylProgramPanel />"), "the Layl program panel must be mounted in the site/mobile admin studio");
assert.ok(!panel.includes('contentFormat: "series_episode"'), "general-audience Layl videos must not be misclassified by the Kids audience contract");

console.log("Layl program factory contract tests passed.");
