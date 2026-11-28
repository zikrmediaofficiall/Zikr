#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => {
  if (!existsSync(path)) { failures.push(`missing required Voice Factory file: ${path}`); return ""; }
  return readFileSync(path, "utf8");
};

const tts = read("scripts/generate-arabic-voice.py");
if (!tts.includes("edge_tts.Communicate")) failures.push("Arabic voice generator must use real Edge TTS synthesis");
if (!tts.includes("from gtts import gTTS")) failures.push("Arabic voice generator must retain the gTTS fallback for blocked datacenter connections");
if (!tts.includes("Both Arabic TTS providers failed")) failures.push("Arabic TTS must report when both the primary and fallback providers fail");
if (!tts.includes("clean_text(text)")) failures.push("Arabic TTS must pass text through the canonical sanitizer");
if (!tts.includes("text[:5000]")) failures.push("Arabic TTS must enforce the 5000-character input cap");
if (!tts.includes('"hadith": {"voice": "ar-SA-HamedNeural"')) failures.push("Hadith Arabic TTS profile must use a male MSA voice");
if (!tts.includes('"rate": "-10%"')) failures.push("Hadith/default Arabic voice rate must be human-like and configurable");
if (!tts.includes("output.stat().st_size < 1024")) failures.push("Arabic TTS must reject empty/tiny outputs");
const canonicalProfiles = read("src/features/videos/services/voice-profiles.ts");
const worker = read("scripts/jobs/template-video-automation.ts");
for (const [profile, voice] of [
  ["documentary_female_msa", "ar-SA-ZariyahNeural"],
  ["egyptian_female_story", "ar-EG-SalmaNeural"],
  ["egyptian_male_story", "ar-EG-ShakirNeural"],
  ["levant_male_story", "ar-JO-TaimNeural"],
]) {
  if (!tts.includes(profile) || !tts.includes(voice)) failures.push("TTS runtime is missing " + profile);
  if (!canonicalProfiles.includes(profile) || !canonicalProfiles.includes(voice)) failures.push("Voice Factory registry is missing " + profile);
}
for (const token of ["ARABIC_TTS_VOICE", "ARABIC_TTS_RATE", "ARABIC_TTS_PITCH"]) if (!tts.includes(token)) failures.push(`Arabic TTS configuration missing: ${token}`);

if (!worker.includes("scripts/generate-arabic-voice.py")) failures.push("production video worker must use the canonical Arabic TTS helper");
const audioPolicy = read("src/features/videos/services/video-audio-policy.ts");
if (!worker.includes("selectVideoVoiceProfile")) failures.push("production video worker must select voice profiles through the canonical audio policy");
if (!worker.includes("resolveVideoAudioRenderPolicy")) failures.push("production video worker must enforce category/source audio policy");
if (!worker.includes("audioPolicy.ttsVoice") || !worker.includes("audioPolicy.ttsRate") || !worker.includes("audioPolicy.ttsPitch")) failures.push("production video worker must use only policy-approved TTS voice/rate/pitch values");
if (!worker.includes("buildVerifiedVideoCaptionTrack")) failures.push("production video worker must use exact-source verified Arabic caption timing");
if (worker.includes("process.env.ARABIC_TTS_VOICE") || worker.includes("process.env.ARABIC_TTS_RATE") || worker.includes("process.env.ARABIC_TTS_PITCH")) failures.push("production video worker must not allow environment overrides of the approved audio identity");
if (!audioPolicy.includes('category === "quran"') || !audioPolicy.includes("quranTtsAllowed: false") || !audioPolicy.includes("quran_ayah_cdn")) failures.push("canonical audio policy must lock Quran to verified human recitation and disallow Quran TTS");
if (!worker.includes('category === "quran" && !audioUrl')) failures.push("Quran videos must reject missing verified recitation rather than falling back to TTS");
if (!worker.includes("Rendered output has no narration/audio stream.")) failures.push("production worker must reject silent renders");

const runner = read("scripts/run-background-jobs.ts");
if (!runner.includes('EDGE_TTS_VERSION = "7.3.1"')) failures.push("background runner must pin edge-tts 7.3.1");
if (!runner.includes("edge-tts==${EDGE_TTS_VERSION}")) failures.push("background runner must install the pinned Edge TTS version");
if (!runner.includes("ensureArabicTtsRuntime()")) failures.push("background runner must verify/bootstrap the TTS runtime");
if (!runner.includes("gTTS==2.5.4")) failures.push("background runner must bootstrap the gTTS Arabic fallback runtime");

const workflow = read(".github/workflows/generate-ai-video.yml");
if (!workflow.includes('cron: "17 3,9,15,21 * * *"')) failures.push("GitHub video workflow must own the production schedule");
if (!workflow.includes("edge-tts==7.3.1")) failures.push("GitHub video workflow must pin edge-tts 7.3.1");
if (!workflow.includes("gTTS==2.5.4")) failures.push("GitHub video workflow must install the no-key Arabic TTS fallback");
if (!workflow.includes("scripts/generate-arabic-voice.py")) failures.push("Video worker must execute the Arabic TTS provider smoke test before processing the production queue");
if (!workflow.includes("zikr-arabic-tts-smoke.mp3")) failures.push("Video worker must assert that Arabic TTS produces a non-empty MP3 before touching the production queue");

const circle = read(".circleci/config.yml");
if (circle.includes("edge-tts==7.3.1")) failures.push("CircleCI must not carry the production video TTS runtime after the ownership split");

if (existsSync("scripts/jobs/free-tier-video-narration.ts")) failures.push("legacy free-tier narration script must be removed from the runtime tree");

const packageJson = JSON.parse(read("package.json"));
if (!packageJson.scripts["voice:factory:check"]) failures.push("voice:factory:check must be registered");
if (!packageJson.scripts["verify:pr"]?.includes("pnpm voice:factory:check")) failures.push("verify:pr must include Voice Factory verification");
if (!packageJson.scripts["verify"]?.includes("pnpm voice:factory:check")) failures.push("verify must include Voice Factory verification");
if (!existsSync("src/features/videos/services/voice-profiles.ts")) failures.push("canonical voice profile service is missing");
if (!existsSync("src/features/videos/services/narration-quality.ts")) failures.push("Arabic narration quality validator is missing");

if (failures.length) {
  console.error("VOICE_FACTORY_CHECK_FAILED");
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log("✅ Phase 9 Voice Factory checks passed");
