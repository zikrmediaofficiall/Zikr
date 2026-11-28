import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VIDEO_AUDIO_POLICY_VERSION,
  buildVerifiedVideoCaptionTrack,
  resolveVideoAudioRenderPolicy,
  selectVideoVoiceProfile,
} from "../../src/features/videos/services/video-audio-policy";
import { resolveVideoComposition } from "../../src/features/videos/services/video-composition";

const quranProfile = selectVideoVoiceProfile({ category: "quran" });
assert.equal(quranProfile.id, "quran_reciter");
assert.equal(quranProfile.mode, "recorded");

const quranAudio = resolveVideoAudioRenderPolicy({
  category: "quran",
  audience: "general",
  hasVerifiedAudioSource: true,
  audioSourceKind: "quran_ayah_cdn",
});
assert.equal(quranAudio.profile.id, "quran_reciter");
assert.equal(quranAudio.sourceMode, "verified_recording");
assert.equal(quranAudio.ttsVoice, null);
assert.equal(quranAudio.quranTtsAllowed, false);
assert.equal(quranAudio.voiceOverrideAllowed, false);

assert.throws(() => resolveVideoAudioRenderPolicy({
  category: "quran",
  audience: "general",
  hasVerifiedAudioSource: false,
}), /verified canonical human recitation source/i);

assert.throws(() => resolveVideoAudioRenderPolicy({
  category: "quran",
  audience: "general",
  requestedProfileId: "documentary_male_msa",
  hasVerifiedAudioSource: true,
  audioSourceKind: "quran_ayah_cdn",
}), /locked to the verified human Quran reciter/i);

const hadith = resolveVideoAudioRenderPolicy({
  category: "hadith",
  audience: "general",
  hasVerifiedAudioSource: false,
});
assert.equal(hadith.profile.id, "hadith_male_msa");
assert.equal(hadith.sourceMode, "arabic_tts");
assert.equal(hadith.ttsVoice, "ar-SA-HamedNeural");
assert.equal(hadith.ttsRate, "-10%");
assert.equal(hadith.ttsPitch, "-1Hz");

const recordedHadith = resolveVideoAudioRenderPolicy({
  category: "hadith",
  audience: "general",
  hasVerifiedAudioSource: true,
  audioSourceKind: "human_recording",
});
assert.equal(recordedHadith.sourceMode, "verified_recording");
assert.equal(recordedHadith.ttsVoice, null);
assert.equal(recordedHadith.sourceKind, "human_recording");

assert.throws(() => selectVideoVoiceProfile({
  category: "hadith",
  audience: "general",
  requestedProfileId: "documentary_male_msa",
}), /must use an approved Hadith voice profile/i);

const adhkar = resolveVideoAudioRenderPolicy({
  category: "adhkar",
  audience: "general",
  hasVerifiedAudioSource: false,
});
assert.equal(adhkar.profile.id, "hadith_male_msa");
assert.equal(adhkar.sourceMode, "arabic_tts");

const kids = resolveVideoAudioRenderPolicy({
  category: "story",
  audience: "kids",
  hasVerifiedAudioSource: false,
});
assert.equal(kids.profile.id, "kids_friendly");
assert.equal(kids.sourceMode, "arabic_tts");
assert.equal(kids.ttsVoice, "ar-EG-ShakirNeural");

assert.throws(() => selectVideoVoiceProfile({
  category: "story",
  audience: "kids",
  requestedProfileId: "egyptian_male_story",
}), /Kids narration may only use an approved Kids voice profile/i);

assert.throws(() => selectVideoVoiceProfile({
  category: "story",
  audience: "general",
  requestedProfileId: "not-a-real-profile",
}), /does not exist in the approved ZIKR voice catalogue/i);

const editorial = resolveVideoAudioRenderPolicy({
  category: "story",
  audience: "general",
  hasVerifiedAudioSource: false,
});
assert.equal(editorial.profile.id, "egyptian_male_story");
assert.equal(editorial.ttsVoice, "ar-EG-ShakirNeural");
assert.equal(editorial.voiceOverrideAllowed, false);

const composition = resolveVideoComposition({
  category: "story",
  audience: "general",
  seed: "audio-policy-caption",
  width: 1080,
  height: 1920,
});
const approvedText = "هذا نص عربي معتمد للكابتشن يجب أن يبقى كما هو دون إضافة أو حذف أو إعادة ترتيب للكلمات.";
const track = buildVerifiedVideoCaptionTrack({
  approvedText,
  audioDurationSeconds: 18.5,
  composition,
});
assert.equal(track.policyVersion, VIDEO_AUDIO_POLICY_VERSION);
assert.equal(track.source, "approved-request-source-text");
assert.equal(track.wordCount, approvedText.trim().split(/\s+/u).length);
assert.equal(track.pages.length, track.cues.length);
assert.ok(track.pages.length >= 1);
assert.ok(track.cues[0].start >= 0);
assert.ok(track.lastCueEndSeconds <= track.audioDurationSeconds + 0.001);
assert.equal(
  track.pages.join(" ").replace(/\\N/g, " ").trim().split(/\s+/u).join("|"),
  approvedText.trim().split(/\s+/u).join("|"),
  "Caption pagination must preserve every approved source token in its original order.",
);

assert.throws(() => buildVerifiedVideoCaptionTrack({
  approvedText: "",
  audioDurationSeconds: 18,
  composition,
}), /Approved narration text is required/i);

assert.throws(() => buildVerifiedVideoCaptionTrack({
  approvedText,
  audioDurationSeconds: 0,
  composition,
}), /duration must be greater than zero/i);


const worker = readFileSync(new URL("../jobs/template-video-automation.ts", import.meta.url), "utf8");
assert.ok(worker.includes("selectVideoVoiceProfile("));
assert.ok(worker.includes("resolveVideoAudioRenderPolicy("));
assert.ok(worker.includes("buildVerifiedVideoCaptionTrack("));
assert.ok(worker.includes("audioPolicy.quranTtsAllowed"));
assert.ok(worker.includes("captionPolicyVersion: VIDEO_AUDIO_POLICY_VERSION"));
assert.ok(!worker.includes("process.env.ARABIC_TTS_VOICE"), "Environment variables must not override an approved voice identity.");
assert.ok(!worker.includes("process.env.ARABIC_TTS_RATE"), "Environment variables must not change the approved voice rate.");
assert.ok(!worker.includes("process.env.ARABIC_TTS_PITCH"), "Environment variables must not change the approved voice pitch.");

console.log("Video audio identity, Quran human-recitation policy, Kids voice isolation, and source-locked Arabic caption checks passed.");
