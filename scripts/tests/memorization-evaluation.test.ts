import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MAX_MEMORIZATION_AUDIO_BYTES,
  hasMemorizationAudioSignature,
  normalizeMemorizationAudioMimeType,
} from "../../src/features/memorization/constants";
import {
  formatMemorizationEvaluation,
  formatMemorizationEvaluationResponse,
  parseMemorizationEvaluation,
} from "../../src/features/memorization/evaluation";
import { getTrustedClientAddress } from "../../src/lib/request/client-address";

assert.equal(MAX_MEMORIZATION_AUDIO_BYTES, 3 * 1024 * 1024);
assert.equal(normalizeMemorizationAudioMimeType("audio/webm;codecs=opus"), "audio/webm");
assert.equal(normalizeMemorizationAudioMimeType("audio/mp4"), "audio/mp4");
assert.equal(normalizeMemorizationAudioMimeType("audio/ogg;codecs=opus"), "audio/ogg");
assert.equal(normalizeMemorizationAudioMimeType("audio/x-wav"), "audio/wav");
assert.equal(normalizeMemorizationAudioMimeType("video/mp4"), null);
assert.equal(normalizeMemorizationAudioMimeType("audio/mpeg"), null);
assert.equal(normalizeMemorizationAudioMimeType(null), null);

const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
const ogg = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);
const mp4 = new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]);
const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
assert.equal(hasMemorizationAudioSignature("audio/webm", webm), true);
assert.equal(hasMemorizationAudioSignature("audio/ogg", ogg), true);
assert.equal(hasMemorizationAudioSignature("audio/mp4", mp4), true);
assert.equal(hasMemorizationAudioSignature("audio/wav", wav), true);
assert.equal(hasMemorizationAudioSignature("audio/webm", ogg), false);
assert.equal(hasMemorizationAudioSignature("audio/mp4", new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70])), false);

const parsed = parseMemorizationEvaluation(JSON.stringify({
  score: "101",
  summary: "  clear recitation  ",
  memorization: "  stable  ",
  errors: [" first ", 4, "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"],
  tajweed: ["  madd  "],
  audioQuality: "  clear  ",
  revisionPlan: Array.from({ length: 10 }, (_, index) => " step " + index + " "),
}));
assert.ok(parsed);
assert.equal(parsed.score, 100);
assert.equal(parsed.summary, "clear recitation");
assert.equal(parsed.errors.length, 8);
assert.deepEqual(parsed.tajweed, ["madd"]);
assert.equal(parsed.revisionPlan.length, 8);
assert.equal(parseMemorizationEvaluation("not json"), null);
assert.equal(parseMemorizationEvaluation(JSON.stringify({ score: true })), null);
assert.equal(parseMemorizationEvaluation(JSON.stringify({ score: " " })), null);
assert.equal(parseMemorizationEvaluation(JSON.stringify([])), null);

const noAudio = formatMemorizationEvaluation({
  score: 99,
  summary: "This score must be suppressed.",
  memorization: "Not evaluated.",
  errors: ["Not an audio error."],
  tajweed: ["General tajweed note."],
  audioQuality: "Not assessed.",
  revisionPlan: ["Review one passage."],
}, false);
assert.ok(noAudio.includes("لم يتم تقييم تسجيل صوتي"));
assert.ok(noAudio.includes("General tajweed note."));
assert.ok(!noAudio.includes("الدرجة:"));
assert.ok(!noAudio.includes("لم تُرصد أخطاء"));
assert.ok(!noAudio.includes("Not an audio error."));

const audioEvaluation = formatMemorizationEvaluation({
  score: 87,
  summary: "Good progress.",
  memorization: "Mostly accurate.",
  errors: ["Missed word."],
  tajweed: [],
  audioQuality: "Clear.",
  revisionPlan: [],
}, true);
assert.ok(audioEvaluation.includes("الدرجة: 87/100"));
assert.ok(audioEvaluation.includes("Missed word."));
assert.ok(formatMemorizationEvaluationResponse("not json", true).includes("لم تُصدر درجة"));
assert.ok(formatMemorizationEvaluationResponse("", false).includes("خطة مراجعة تعليمية"));

assert.equal(getTrustedClientAddress(" 203.0.113.7 ", "198.51.100.1, 10.0.0.1"), "203.0.113.7");
assert.equal(getTrustedClientAddress(null, "198.51.100.1, 10.0.0.1"), "10.0.0.1");
assert.equal(getTrustedClientAddress(null, null), "unknown");

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actionSource = read("src/app/memorization/actions.ts");
const recorderSource = read("src/app/memorization/voice-recorder.tsx");
const pageSource = read("src/app/memorization/page.tsx");

assert.ok(actionSource.includes("audioFile.size > MAX_MEMORIZATION_AUDIO_BYTES"));
assert.ok(actionSource.includes("hasMemorizationAudioSignature(audioMimeType, audioBytes)"));
assert.ok(actionSource.includes("consumeMemorizationAiRateLimit(clientAddress)"));
const signatureCheckPosition = actionSource.indexOf("hasMemorizationAudioSignature(audioMimeType, audioBytes)");
const providerCallPosition = actionSource.indexOf("const response = await generateGeminiFromAudio");
const rateLimitPosition = actionSource.indexOf("consumeMemorizationAiRateLimit(clientAddress)");
assert.ok(signatureCheckPosition > 0 && signatureCheckPosition < providerCallPosition);
assert.ok(rateLimitPosition > 0 && rateLimitPosition < providerCallPosition);
assert.doesNotMatch(actionSource, /\.storage\.from|\.upload\(/i, "audio evaluation must not persist recordings in Supabase Storage");

assert.ok(recorderSource.includes("const mountedRef = useRef(true)"));
assert.ok(recorderSource.includes("const startInProgressRef = useRef(false)"));
const cleanupStart = recorderSource.indexOf("useEffect(() =>");
const cleanupEnd = recorderSource.indexOf("function stopStream()", cleanupStart);
const cleanup = recorderSource.slice(cleanupStart, cleanupEnd);
assert.ok(cleanup.includes("mountedRef.current = false"));
assert.ok(cleanup.includes("streamRef.current?.getTracks().forEach"));
const startPosition = recorderSource.indexOf("async function startRecording()");
const stopPosition = recorderSource.indexOf("function stopRecording()", startPosition);
const startFunction = recorderSource.slice(startPosition, stopPosition);
assert.ok(startFunction.includes("if (startInProgressRef.current || recorderRef.current || streamRef.current) return"));
const mediaRequestPosition = startFunction.indexOf("await navigator.mediaDevices.getUserMedia");
const unmountGuardPosition = startFunction.indexOf("if (!mountedRef.current)", mediaRequestPosition);
const streamAssignmentPosition = startFunction.indexOf("streamRef.current = stream", mediaRequestPosition);
assert.ok(mediaRequestPosition >= 0 && unmountGuardPosition > mediaRequestPosition && unmountGuardPosition < streamAssignmentPosition,
  "a microphone permission result that arrives after unmount must stop its tracks before the stream is retained");
const dataHandlerStart = startFunction.indexOf("recorder.ondataavailable");
const errorHandlerStart = startFunction.indexOf("recorder.onerror");
const stopHandlerStart = startFunction.indexOf("recorder.onstop");
assert.ok(startFunction.slice(dataHandlerStart, errorHandlerStart).includes("!mountedRef.current"));
assert.ok(startFunction.slice(errorHandlerStart, stopHandlerStart).includes("if (mountedRef.current)"));
assert.ok(startFunction.slice(stopHandlerStart).includes("if (!mountedRef.current)"));

assert.ok(recorderSource.includes("خدمة Gemini لتحليل التلاوة"));
assert.ok(recorderSource.includes("لا يُحفظ كملف في مساحة تخزين الموقع"));
assert.ok(pageSource.includes("عبر خدمة الذكاء الاصطناعي عند إرسال التسجيل"));
assert.ok(!pageSource.includes("عند تفعيل API الصوت"));

console.log("Memorization audio validation, privacy, rate-limit, and microphone lifecycle contracts passed.");
