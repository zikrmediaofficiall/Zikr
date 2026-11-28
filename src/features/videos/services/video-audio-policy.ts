import {
  VIDEO_VOICE_PROFILES,
  getDefaultVideoVoiceProfile,
  type VideoVoiceProfile,
} from "./voice-profiles";
import {
  paginateCaptionText,
  planCaptionTimings,
  type CaptionTiming,
  type VideoCompositionProfile,
} from "./video-composition";

export const VIDEO_AUDIO_POLICY_VERSION = "zikr-audio-caption-policy-v1";

export type VideoAudioSourceMode = "verified_recording" | "arabic_tts";
export type VideoAudioSourceKind =
  | "quran_ayah_cdn"
  | "human_recording"
  | "source_audio"
  | "arabic_tts";

export type VideoAudioRenderPolicy = {
  version: typeof VIDEO_AUDIO_POLICY_VERSION;
  category: string;
  audience: "general" | "kids";
  profile: VideoVoiceProfile;
  sourceMode: VideoAudioSourceMode;
  sourceKind: VideoAudioSourceKind;
  ttsVoice: string | null;
  ttsRate: string;
  ttsPitch: string;
  voiceOverrideAllowed: false;
  narrationTextAuthority: "approved-request-source";
  quranTtsAllowed: false;
};

export type VideoCaptionTrack = {
  policyVersion: typeof VIDEO_AUDIO_POLICY_VERSION;
  source: "approved-request-source-text";
  textCharacterCount: number;
  wordCount: number;
  audioDurationSeconds: number;
  pages: string[];
  cues: CaptionTiming[];
  lastCueEndSeconds: number;
};

function normalizeCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized === "stories") return "story";
  return normalized;
}

function findProfile(profileId: string): VideoVoiceProfile | null {
  return VIDEO_VOICE_PROFILES.find((profile) => profile.id === profileId) ?? null;
}

/**
 * Selects an immutable voice identity according to category and audience.
 * An explicit but unknown/mismatched profile is rejected rather than falling
 * through to the default Hadith voice.
 */
export function selectVideoVoiceProfile(input: {
  category: string;
  audience?: unknown;
  requestedProfileId?: string | null;
}): VideoVoiceProfile {
  const category = normalizeCategory(input.category);
  const audience = input.audience === "kids" || category === "kids" ? "kids" : "general";
  const requestedId = input.requestedProfileId?.trim();
  const requested = requestedId ? findProfile(requestedId) : null;

  if (requestedId && !requested) {
    throw new Error("Requested voice profile does not exist in the approved ZIKR voice catalogue.");
  }

  if (category === "quran") {
    if (requestedId && requestedId !== "quran_reciter") {
      throw new Error("Quran narration is locked to the verified human Quran reciter profile.");
    }
    return getDefaultVideoVoiceProfile("quran");
  }

  if (audience === "kids") {
    if (requested && requested.style !== "kids") {
      throw new Error("Kids narration may only use an approved Kids voice profile.");
    }
    return getDefaultVideoVoiceProfile("kids");
  }

  if (category === "hadith" || category === "adhkar") {
    if (requested && requested.style !== "hadith") {
      throw new Error("Hadith and Adhkar narration must use an approved Hadith voice profile.");
    }
    return getDefaultVideoVoiceProfile(category);
  }

  if (requested && requested.style !== "documentary") {
    throw new Error("General editorial narration must use a documentary voice profile.");
  }
  return requested ?? getDefaultVideoVoiceProfile(category);
}

/**
 * Resolves whether a request uses an already-verified recording or TTS.
 * Quran is fail-closed and requires a verified source; no TTS fallback exists.
 */
export function resolveVideoAudioRenderPolicy(input: {
  category: string;
  audience?: unknown;
  requestedProfileId?: string | null;
  hasVerifiedAudioSource: boolean;
  audioSourceKind?: VideoAudioSourceKind | null;
}): VideoAudioRenderPolicy {
  const category = normalizeCategory(input.category);
  const audience = input.audience === "kids" || category === "kids" ? "kids" : "general";
  const profile = selectVideoVoiceProfile(input);
  const hasVerifiedAudioSource = input.hasVerifiedAudioSource === true;

  if (category === "quran") {
    if (!hasVerifiedAudioSource || input.audioSourceKind !== "quran_ayah_cdn") {
      throw new Error("Quran video requires a verified canonical human recitation source; TTS is never permitted.");
    }
    return {
      version: VIDEO_AUDIO_POLICY_VERSION,
      category,
      audience,
      profile,
      sourceMode: "verified_recording",
      sourceKind: "quran_ayah_cdn",
      ttsVoice: null,
      ttsRate: "0%",
      ttsPitch: "0Hz",
      voiceOverrideAllowed: false,
      narrationTextAuthority: "approved-request-source",
      quranTtsAllowed: false,
    };
  }

  if (hasVerifiedAudioSource) {
    const sourceKind = input.audioSourceKind ?? "source_audio";
    if (sourceKind === "quran_ayah_cdn") {
      throw new Error("Canonical Quran audio cannot be used as a substitute for a non-Quran category source.");
    }
    return {
      version: VIDEO_AUDIO_POLICY_VERSION,
      category,
      audience,
      profile,
      sourceMode: "verified_recording",
      sourceKind,
      ttsVoice: null,
      ttsRate: profile.rate,
      ttsPitch: profile.pitch,
      voiceOverrideAllowed: false,
      narrationTextAuthority: "approved-request-source",
      quranTtsAllowed: false,
    };
  }

  if (profile.mode !== "tts" || !profile.voice) {
    throw new Error("The selected voice profile requires a verified recording; TTS fallback is disabled.");
  }

  return {
    version: VIDEO_AUDIO_POLICY_VERSION,
    category,
    audience,
    profile,
    sourceMode: "arabic_tts",
    sourceKind: "arabic_tts",
    ttsVoice: profile.voice,
    ttsRate: profile.rate,
    ttsPitch: profile.pitch,
    voiceOverrideAllowed: false,
    narrationTextAuthority: "approved-request-source",
    quranTtsAllowed: false,
  };
}

/**
 * Creates captions from the exact approved narration text and the actual
 * probed audio duration. It rejects any lost, duplicated, reordered or
 * out-of-track text during pagination and timing.
 */
export function buildVerifiedVideoCaptionTrack(input: {
  approvedText: string;
  audioDurationSeconds: number;
  composition: Pick<VideoCompositionProfile, "lineChars" | "linesPerPage">;
}): VideoCaptionTrack {
  const approvedText = input.approvedText;
  if (typeof approvedText !== "string" || !approvedText.trim()) {
    throw new Error("Approved narration text is required for Arabic caption generation.");
  }
  if (!Number.isFinite(input.audioDurationSeconds) || input.audioDurationSeconds <= 0 || input.audioDurationSeconds > 135) {
    throw new Error("Caption audio duration must be greater than zero and no more than 135 seconds.");
  }

  const sourceTokens = approvedText.trim().split(/\s+/);
  const pages = paginateCaptionText(
    approvedText,
    input.composition.lineChars,
    input.composition.linesPerPage,
  );
  const reconstructedTokens = pages
    .join(" ")
    .replace(/\\N/g, " ")
    .trim()
    .split(/\s+/);
  if (
    sourceTokens.length !== reconstructedTokens.length ||
    sourceTokens.some((token, index) => token !== reconstructedTokens[index])
  ) {
    throw new Error("Arabic caption pagination did not preserve the exact approved narration token sequence.");
  }

  const cues = planCaptionTimings(pages, input.audioDurationSeconds);
  if (cues.length !== pages.length) {
    throw new Error("Arabic caption timing did not return one cue per source page.");
  }
  let previousEnd = 0;
  for (const cue of cues) {
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < previousEnd ||
      cue.end <= cue.start ||
      cue.end > input.audioDurationSeconds + 0.001
    ) {
      throw new Error("Arabic caption cue timing overlaps or exceeds the verified audio duration.");
    }
    previousEnd = cue.end;
  }

  return {
    policyVersion: VIDEO_AUDIO_POLICY_VERSION,
    source: "approved-request-source-text",
    textCharacterCount: approvedText.length,
    wordCount: sourceTokens.length,
    audioDurationSeconds: input.audioDurationSeconds,
    pages,
    cues,
    lastCueEndSeconds: cues[cues.length - 1]?.end ?? 0,
  };
}
