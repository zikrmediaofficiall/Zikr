import { createHash } from "node:crypto";
import { KIDS_VIDEO_SERIES, type GeneratedKidsEpisode } from "../data/kids-story-factory";
import {
  VIDEO_TEMPLATE_ASSETS,
  isVideoTemplateAssetAllowedForAudience,
  type VideoTemplateAsset,
} from "./template-config";
import { selectVideoVoiceProfile } from "./video-audio-policy";

export const KIDS_VIDEO_PRODUCTION_MANIFEST_VERSION = "kids-video-production-v1";
export type KidsCharacterPose = "idle" | "curious" | "thinking" | "listening" | "helping" | "celebrating";

export type KidsCharacterRig = {
  characterId: string;
  seriesId: string;
  displayNameAr: string;
  role: string;
  rigVersion: "zikr-kids-vector-v1";
  continuityKey: string;
  palette: { skin: string; hair: string; outfit: string; accent: string; shoes: string };
};

export type KidsCharacterCue = { characterId: string; pose: KidsCharacterPose };
export type KidsScenePack = {
  id: "classroom" | "home-family" | "nature-garden" | "space-exploration" | "ocean-exploration" | "science-workshop" | "moral-neighborhood";
  labelAr: string;
  assetKeys: readonly VideoTemplateAsset[];
};

export type KidsProductionBeat = {
  id: "opening" | "challenge" | "safe_action" | "resolution";
  narrationAnchor: string;
  visualDirectionAr: string;
  assetKey: VideoTemplateAsset;
  characterCues: KidsCharacterCue[];
};

export type KidsVideoProductionManifest = {
  version: typeof KIDS_VIDEO_PRODUCTION_MANIFEST_VERSION;
  sourceId: string;
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  factorySequence: number;
  audience: "kids";
  ageGroupLabel: string;
  ageRange: { minAge: number; maxAge: number };
  learningObjective: string;
  source: { type: "original_kids_fiction"; label: string; historicalOrReligiousSourceClaim: false };
  scenePack: { id: KidsScenePack["id"]; assetKeys: VideoTemplateAsset[]; safeVisualBeats: KidsProductionBeat[] };
  characterContinuity: { rigVersion: "zikr-kids-vector-v1"; characters: KidsCharacterRig[] };
  narration: {
    profileId: "kids_friendly";
    voice: string;
    rate: string;
    pitch: string;
    maximumDurationSeconds: 60;
    maximumWordCount: 220;
    sourceTextAuthority: "canonical-kids-episode";
  };
  soundDesign: { backgroundMusic: "none"; soundEffects: "none"; policy: "voice-and-original-ambience-only" };
  childSafety: {
    personalDataSolicitation: "blocked";
    offPlatformContact: "blocked";
    unsupportedReligiousAttribution: "blocked";
    externalProviderVisuals: "disabled";
    parentOrGuardianReview: "risk-based-sampling";
  };
  narrationWordCount: number;
  narrationSha256: string;
  manifestSha256: string;
};

const KIDS_FICTION_SOURCE_LABEL =
  "قصة تربوية خيالية أصلية من ذِكر — ليست آية أو حديثًا أو واقعة تاريخية.";

const AGE_RANGES: Record<string, { minAge: number; maxAge: number }> = {
  "salim-nour": { minAge: 6, maxAge: 10 },
  "garden-friends": { minAge: 5, maxAge: 10 },
  "little-inventors": { minAge: 7, maxAge: 11 },
  "little-good-steps": { minAge: 5, maxAge: 10 },
};

const SCENE_PACKS: Record<KidsScenePack["id"], KidsScenePack> = {
  classroom: { id: "classroom", labelAr: "الفصل والمدرسة", assetKeys: ["kids-classroom", "kids-neighborhood", "kids-playground", "kids-garden"] },
  "home-family": { id: "home-family", labelAr: "البيت والأسرة", assetKeys: ["kids-neighborhood", "kids-garden", "kids-classroom", "kids-playground"] },
  "nature-garden": { id: "nature-garden", labelAr: "الطبيعة والحديقة", assetKeys: ["kids-nature", "kids-garden", "kids-forest", "kids-animals"] },
  "space-exploration": { id: "space-exploration", labelAr: "الفضاء والاستكشاف", assetKeys: ["kids-space", "kids-robotics", "kids-weather", "kids-classroom"] },
  "ocean-exploration": { id: "ocean-exploration", labelAr: "المحيط والحياة البحرية", assetKeys: ["kids-ocean", "kids-animals", "kids-nature", "kids-garden"] },
  "science-workshop": { id: "science-workshop", labelAr: "ورشة العلوم والاختراع", assetKeys: ["kids-workshop", "kids-robotics", "kids-space", "kids-classroom"] },
  "moral-neighborhood": { id: "moral-neighborhood", labelAr: "الحي ومواقف الخير", assetKeys: ["kids-neighborhood", "kids-garden", "kids-playground", "kids-classroom"] },
};

const SERIES_SCENE_PACKS: Record<string, readonly KidsScenePack["id"][]> = {
  "salim-nour": ["classroom", "home-family", "moral-neighborhood"],
  "garden-friends": ["nature-garden", "ocean-exploration", "home-family"],
  "little-inventors": ["science-workshop", "space-exploration", "nature-garden"],
  "little-good-steps": ["moral-neighborhood", "home-family", "nature-garden"],
};

const CHARACTER_RIGS: readonly KidsCharacterRig[] = [
  { characterId: "salim", seriesId: "salim-nour", displayNameAr: "سليم", role: "صديق فضولي ومتعاون", rigVersion: "zikr-kids-vector-v1", continuityKey: "salim-nour:salim:v1", palette: { skin: "#D99A6C", hair: "#30251F", outfit: "#3676A8", accent: "#E9B85C", shoes: "#34445C" } },
  { characterId: "nour", seriesId: "salim-nour", displayNameAr: "نور", role: "صديقة مبادرة ومستمعة", rigVersion: "zikr-kids-vector-v1", continuityKey: "salim-nour:nour:v1", palette: { skin: "#C9855E", hair: "#2B2527", outfit: "#8D5A9D", accent: "#F1C969", shoes: "#51415D" } },
  { characterId: "classmate", seriesId: "salim-nour", displayNameAr: "الصديق الجديد", role: "زميل جديد يتعلم التعاون", rigVersion: "zikr-kids-vector-v1", continuityKey: "salim-nour:classmate:v1", palette: { skin: "#A96F4D", hair: "#211F24", outfit: "#5C9A86", accent: "#F0C56E", shoes: "#3D4A55" } },
  { characterId: "teacher", seriesId: "salim-nour", displayNameAr: "المعلمة", role: "شخصية راشدة داعمة", rigVersion: "zikr-kids-vector-v1", continuityKey: "salim-nour:teacher:v1", palette: { skin: "#D49A78", hair: "#49372D", outfit: "#597A9C", accent: "#E7BB75", shoes: "#3E485B" } },
  { characterId: "mariam", seriesId: "garden-friends", displayNameAr: "مريم", role: "صديقة تلاحظ وتعتني بالطبيعة", rigVersion: "zikr-kids-vector-v1", continuityKey: "garden-friends:mariam:v1", palette: { skin: "#C7835C", hair: "#2D2522", outfit: "#6A9B68", accent: "#F0C968", shoes: "#465543" } },
  { characterId: "layla", seriesId: "garden-friends", displayNameAr: "ليلى", role: "صديقة هادئة ورفيقة بالحيوان", rigVersion: "zikr-kids-vector-v1", continuityKey: "garden-friends:layla:v1", palette: { skin: "#E0AC82", hair: "#4A332C", outfit: "#6C83B7", accent: "#F4D17D", shoes: "#49506A" } },
  { characterId: "adam", seriesId: "garden-friends", displayNameAr: "آدم", role: "صديق محب للاستكشاف", rigVersion: "zikr-kids-vector-v1", continuityKey: "garden-friends:adam:v1", palette: { skin: "#B97C59", hair: "#33261F", outfit: "#D18A4C", accent: "#F1CD74", shoes: "#4B4651" } },
  { characterId: "garden-supervisor", seriesId: "garden-friends", displayNameAr: "مشرف الحديقة", role: "شخصية راشدة تحافظ على السلامة", rigVersion: "zikr-kids-vector-v1", continuityKey: "garden-friends:supervisor:v1", palette: { skin: "#C68B68", hair: "#44352D", outfit: "#527E72", accent: "#E6BB6D", shoes: "#3D4A4A" } },
  { characterId: "inventor-1", seriesId: "little-inventors", displayNameAr: "المخترع الأول", role: "عضو فريق التجربة", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-inventors:inventor-1:v1", palette: { skin: "#D49A73", hair: "#3A302A", outfit: "#477FA5", accent: "#E6C46F", shoes: "#3E4B5D" } },
  { characterId: "inventor-2", seriesId: "little-inventors", displayNameAr: "المخترعة الثانية", role: "عضوة فريق التصميم", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-inventors:inventor-2:v1", palette: { skin: "#B97B5B", hair: "#2A2524", outfit: "#8D689B", accent: "#F0CB78", shoes: "#494253" } },
  { characterId: "inventor-3", seriesId: "little-inventors", displayNameAr: "المخترع الثالث", role: "عضو فريق الاختبار", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-inventors:inventor-3:v1", palette: { skin: "#E0AA81", hair: "#45332A", outfit: "#5D9A82", accent: "#EBC26B", shoes: "#43514D" } },
  { characterId: "inventor-teacher", seriesId: "little-inventors", displayNameAr: "المعلمة", role: "شخصية راشدة توجه التجربة الآمنة", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-inventors:teacher:v1", palette: { skin: "#C98C69", hair: "#40302A", outfit: "#5576A3", accent: "#E8C16B", shoes: "#3E4A59" } },
  { characterId: "salma", seriesId: "little-good-steps", displayNameAr: "سلمى", role: "صديقة مبادرة", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:salma:v1", palette: { skin: "#D29A74", hair: "#302521", outfit: "#628B9F", accent: "#EFC56E", shoes: "#47515D" } },
  { characterId: "fadi", seriesId: "little-good-steps", displayNameAr: "فادي", role: "صديق كريم", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:fadi:v1", palette: { skin: "#B77A58", hair: "#33271F", outfit: "#A66C84", accent: "#F0C86F", shoes: "#4D4654" } },
  { characterId: "reem", seriesId: "little-good-steps", displayNameAr: "ريم", role: "صديقة تحترم الآخرين", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:reem:v1", palette: { skin: "#E0AD84", hair: "#4A352D", outfit: "#739866", accent: "#F1D17A", shoes: "#435247" } },
  { characterId: "yasser", seriesId: "little-good-steps", displayNameAr: "ياسر", role: "صديق يحب المشاركة", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:yasser:v1", palette: { skin: "#C88964", hair: "#2D2623", outfit: "#557EAE", accent: "#E8BE70", shoes: "#434E60" } },
  { characterId: "family-adult", seriesId: "little-good-steps", displayNameAr: "أحد أفراد الأسرة", role: "شخصية راشدة داعمة", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:family-adult:v1", palette: { skin: "#D09A78", hair: "#41332D", outfit: "#6A8C83", accent: "#E8BD71", shoes: "#44524D" } },
  { characterId: "elder-neighbor", seriesId: "little-good-steps", displayNameAr: "الجار الكبير", role: "جار يحظى بالاحترام", rigVersion: "zikr-kids-vector-v1", continuityKey: "little-good-steps:elder-neighbor:v1", palette: { skin: "#C18B6D", hair: "#8A8B86", outfit: "#687C9A", accent: "#EDC878", shoes: "#4A4F57" } },
];

const POSES: readonly KidsCharacterPose[] = ["idle", "curious", "thinking", "listening", "helping", "celebrating"];
const STORY_BEAT_IDS = ["opening", "challenge", "safe_action", "resolution"] as const;
const VISUAL_DIRECTION: Record<(typeof STORY_BEAT_IDS)[number], string> = {
  opening: "تعريف هادئ بالمكان والشخصيات دون أي كتابة داخل الصورة",
  challenge: "إظهار الموقف من مسافة آمنة مع تعبير فضولي غير مخيف",
  safe_action: "إظهار التعاون وطلب مساعدة الشخص الراشد عند الحاجة",
  resolution: "إظهار نتيجة إيجابية واحتفال هادئ دون مبالغة",
};
const UNSUPPORTED_RELIGIOUS_ATTRIBUTION = /(?:قال|يقول)\s*(?:الله|الرسول|رسول\s*الله|النبي)|حديث\s*(?:نبوي|قدسي)|القرآن\s*الكريم|(?:آية|سورة)\s*\d+/u;

function hashNumber(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
function sha256(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortJsonValue(record[key])]));
  }
  return value;
}
function stableJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value)) ?? "null";
}
function normalizeText(value: string): string { return value.normalize("NFC").replace(/\s+/gu, " ").trim(); }
function countWords(value: string): number { return normalizeText(value).split(/\s+/u).filter(Boolean).length; }

function charactersForSeries(seriesId: string): KidsCharacterRig[] {
  return CHARACTER_RIGS.filter((character) => character.seriesId === seriesId);
}

function selectScenePack(seriesId: string, sequence: number): KidsScenePack {
  const options = SERIES_SCENE_PACKS[seriesId];
  if (!options?.length) throw new Error("Kids series is missing an approved scene-pack assignment.");
  const pack = SCENE_PACKS[options[hashNumber(seriesId + ":" + sequence + ":scene-pack") % options.length]];
  if (!pack) throw new Error("Selected Kids scene pack does not exist.");
  return pack;
}

function cuesForBeat(seriesId: string, sequence: number, beatIndex: number): KidsCharacterCue[] {
  const characters = charactersForSeries(seriesId);
  if (characters.length < 2) throw new Error("A Kids series needs at least two recurring characters.");
  const lead = characters[hashNumber(seriesId + ":" + sequence + ":lead") % Math.min(characters.length, 2)];
  const support = characters[2 + (hashNumber(seriesId + ":" + sequence + ":support") % Math.max(1, characters.length - 2))] ?? characters[1];
  const groups: KidsCharacterCue[][] = [
    [{ characterId: lead.characterId, pose: "curious" }, { characterId: support.characterId, pose: "listening" }],
    [{ characterId: lead.characterId, pose: "thinking" }, { characterId: support.characterId, pose: "curious" }],
    [{ characterId: lead.characterId, pose: "helping" }, { characterId: support.characterId, pose: "helping" }],
    characters.slice(0, 4).map((character) => ({ characterId: character.characterId, pose: "celebrating" as const })),
  ];
  return groups[beatIndex];
}

function makeUnsignedManifest(episode: GeneratedKidsEpisode, factorySequence: number) {
  if (UNSUPPORTED_RELIGIOUS_ATTRIBUTION.test(episode.text)) {
    throw new Error("Original Kids fiction contains an unsupported religious attribution and cannot enter the production factory.");
  }
  const canonicalSeries = KIDS_VIDEO_SERIES.find((series) => series.id === episode.seriesId);
  const ageRange = AGE_RANGES[episode.seriesId];
  if (!canonicalSeries || !ageRange || episode.ageGroup !== canonicalSeries.ageGroup) {
    throw new Error("Kids episode age band does not match its canonical series registry.");
  }
  const narrationWordCount = countWords(episode.text);
  if (narrationWordCount > 220) throw new Error("Kids narration exceeds the approved 220-word production limit.");
  const pack = selectScenePack(episode.seriesId, factorySequence);
  const characters = charactersForSeries(episode.seriesId);
  const voice = selectVideoVoiceProfile({ category: "story", audience: "kids", requestedProfileId: "kids_friendly" });
  if (voice.style !== "kids" || voice.id !== "kids_friendly" || !voice.voice) {
    throw new Error("Kids narration must resolve through the approved Kids-only voice profile.");
  }
  const anchors = [episode.storyBeats.opening, episode.storyBeats.problem, episode.storyBeats.action, episode.storyBeats.outcome];
  const beats = STORY_BEAT_IDS.map((id, index): KidsProductionBeat => {
    const assetKey = pack.assetKeys[hashNumber(episode.sourceId + ":" + id + ":asset") % pack.assetKeys.length];
    if (!VIDEO_TEMPLATE_ASSETS.includes(assetKey) || !isVideoTemplateAssetAllowedForAudience(assetKey, "kids")) {
      throw new Error("Kids production manifest selected an asset outside the approved Kids visual library.");
    }
    return {
      id,
      narrationAnchor: anchors[index],
      visualDirectionAr: VISUAL_DIRECTION[id],
      assetKey,
      characterCues: cuesForBeat(episode.seriesId, factorySequence, index),
    };
  });
  return {
    version: KIDS_VIDEO_PRODUCTION_MANIFEST_VERSION,
    sourceId: episode.sourceId,
    seriesId: episode.seriesId,
    seriesTitle: episode.seriesTitle,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    episodeTitle: episode.episodeTitle,
    factorySequence,
    audience: "kids" as const,
    ageGroupLabel: episode.ageGroup,
    ageRange,
    learningObjective: episode.learningObjective,
    source: { type: "original_kids_fiction" as const, label: KIDS_FICTION_SOURCE_LABEL, historicalOrReligiousSourceClaim: false as const },
    scenePack: { id: pack.id, assetKeys: [...pack.assetKeys], safeVisualBeats: beats },
    characterContinuity: { rigVersion: "zikr-kids-vector-v1" as const, characters },
    narration: {
      profileId: "kids_friendly" as const,
      voice: voice.voice,
      rate: voice.rate,
      pitch: voice.pitch,
      maximumDurationSeconds: 60 as const,
      maximumWordCount: 220 as const,
      sourceTextAuthority: "canonical-kids-episode" as const,
    },
    soundDesign: { backgroundMusic: "none" as const, soundEffects: "none" as const, policy: "voice-and-original-ambience-only" as const },
    childSafety: {
      personalDataSolicitation: "blocked" as const,
      offPlatformContact: "blocked" as const,
      unsupportedReligiousAttribution: "blocked" as const,
      externalProviderVisuals: "disabled" as const,
      parentOrGuardianReview: "risk-based-sampling" as const,
    },
    narrationWordCount,
    narrationSha256: sha256(normalizeText(episode.text)),
  };
}

export function buildKidsVideoProductionManifest(episode: GeneratedKidsEpisode, factorySequence: number): KidsVideoProductionManifest {
  if (!Number.isSafeInteger(factorySequence) || factorySequence < 1) throw new Error("Kids production manifest requires a positive canonical factory sequence.");
  const unsigned = makeUnsignedManifest(episode, factorySequence);
  return { ...unsigned, manifestSha256: sha256(stableJson(unsigned)) };
}

export function validateKidsVideoProductionManifest(
  manifest: unknown,
  episode: GeneratedKidsEpisode,
  expectedSequence: number,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, errors: ["Kids production manifest is missing or malformed."] };
  }
  const value = manifest as KidsVideoProductionManifest;
  let canonical: KidsVideoProductionManifest;
  try { canonical = buildKidsVideoProductionManifest(episode, expectedSequence); }
  catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : String(error)] }; }

  if (value.version !== KIDS_VIDEO_PRODUCTION_MANIFEST_VERSION) errors.push("Kids production manifest version is not supported.");
  if (value.sourceId !== episode.sourceId || value.factorySequence !== expectedSequence) errors.push("Kids manifest source identity does not match the canonical episode.");
  if (value.ageRange?.minAge !== canonical.ageRange.minAge || value.ageRange?.maxAge !== canonical.ageRange.maxAge) errors.push("Kids manifest age band does not match its canonical series.");
  if (value.narration?.profileId !== "kids_friendly" || value.narration?.voice !== canonical.narration.voice || value.narration?.rate !== canonical.narration.rate || value.narration?.pitch !== canonical.narration.pitch || value.narration?.maximumDurationSeconds !== 60 || value.narration?.maximumWordCount !== 220 || value.narration?.sourceTextAuthority !== "canonical-kids-episode") errors.push("Kids narration profile or speech policy is not approved.");
  if (value.source?.type !== "original_kids_fiction" || value.source?.historicalOrReligiousSourceClaim !== false) errors.push("Kids episode source must remain explicitly original fiction.");
  if (value.soundDesign?.backgroundMusic !== "none" || value.soundDesign?.soundEffects !== "none") errors.push("Kids production must not introduce an unapproved music bed or sound effects.");
  if (value.childSafety?.personalDataSolicitation !== "blocked" || value.childSafety?.offPlatformContact !== "blocked") errors.push("Kids child-safety restrictions are incomplete.");
  if (value.childSafety?.externalProviderVisuals !== "disabled" || value.childSafety?.unsupportedReligiousAttribution !== "blocked" || value.childSafety?.parentOrGuardianReview !== "risk-based-sampling") errors.push("Kids visual or editorial safety restrictions are incomplete.");
  if (!Array.isArray(value.scenePack?.safeVisualBeats) || value.scenePack.safeVisualBeats.length !== 4) {
    errors.push("Kids manifest must contain four canonical visual beats.");
  } else {
    for (let index = 0; index < value.scenePack.safeVisualBeats.length; index += 1) {
      const beat = value.scenePack.safeVisualBeats[index];
      const expected = canonical.scenePack.safeVisualBeats[index];
      if (beat.id !== STORY_BEAT_IDS[index] || beat.assetKey !== expected.assetKey || beat.narrationAnchor !== expected.narrationAnchor) {
        errors.push("Kids visual beat " + String(index + 1) + " does not match its canonical story source.");
      }
      if (!VIDEO_TEMPLATE_ASSETS.includes(beat.assetKey) || !isVideoTemplateAssetAllowedForAudience(beat.assetKey, "kids")) {
        errors.push("Kids visual beat " + String(index + 1) + " references an unapproved asset.");
      }
      if (!Array.isArray(beat.characterCues) || !beat.characterCues.length || beat.characterCues.some((cue) =>
        !canonical.characterContinuity.characters.some((character) => character.characterId === cue.characterId) ||
        !POSES.includes(cue.pose)
      )) {
        errors.push("Kids visual beat " + String(index + 1) + " breaks recurring character continuity.");
      }
    }
  }
  if (!Array.isArray(value.characterContinuity?.characters) || value.characterContinuity.characters.length !== canonical.characterContinuity.characters.length) {
    errors.push("Kids recurring character registry is incomplete.");
  }
  const unsigned = { ...value } as Record<string, unknown>;
  delete unsigned.manifestSha256;
  const calculated = sha256(stableJson(unsigned));
  if (value.manifestSha256 !== calculated || value.manifestSha256 !== canonical.manifestSha256) errors.push("Kids production manifest fingerprint is invalid or stale.");
  if (value.narrationWordCount !== canonical.narrationWordCount || value.narrationSha256 !== canonical.narrationSha256) errors.push("Kids production manifest narration fingerprint or word count does not match canonical story text.");
  return { ok: errors.length === 0, errors };
}

export function buildKidsCharacterSceneSvg(cues: readonly KidsCharacterCue[]): string {
  if (!Array.isArray(cues) || cues.length < 1 || cues.length > 4) throw new Error("Kids character scene requires one to four approved character cues.");
  const groups = cues.map((cue, index) => {
    const rig = CHARACTER_RIGS.find((character) => character.characterId === cue.characterId);
    if (!rig || !POSES.includes(cue.pose)) throw new Error("Kids character cue is not present in the versioned rig registry.");
    const colors = rig.palette;
    const arms: Record<KidsCharacterPose, string> = {
      idle: "M-72 330 L-104 510 M72 330 L104 510",
      curious: "M-72 330 L-125 430 L-84 475 M72 330 L104 510",
      thinking: "M-72 330 L-104 510 M72 330 L126 245 L102 190",
      listening: "M-72 330 L-104 490 M72 330 L104 490",
      helping: "M-72 330 L-158 385 M72 330 L158 385",
      celebrating: "M-72 330 L-145 175 M72 330 L145 175",
    };
    const centerX = 540 + (index - (cues.length - 1) / 2) * 265;
    return '<g transform="translate(' + centerX + ' 1020) scale(0.72)">' +
      '<ellipse cx="0" cy="610" rx="160" ry="38" fill="#12251F" opacity=".22"/>' +
      '<path d="' + arms[cue.pose] + '" fill="none" stroke="' + colors.skin + '" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M-58 495 L-77 665 L-80 795 M58 495 L77 665 L80 795" fill="none" stroke="' + colors.shoes + '" stroke-width="56" stroke-linecap="round"/>' +
      '<path d="M-130 295 Q0 235 130 295 L115 510 Q0 570 -115 510 Z" fill="' + colors.outfit + '" stroke="#243B3A" stroke-width="14"/>' +
      '<path d="M-88 350 Q0 398 88 350" fill="none" stroke="' + colors.accent + '" stroke-width="16" stroke-linecap="round"/>' +
      '<circle cx="0" cy="120" r="132" fill="' + colors.skin + '" stroke="#51392F" stroke-width="14"/>' +
      '<path d="M-132 105 Q-145 -40 -42 -48 Q30 -105 105 -32 Q148 20 132 100 Q82 46 36 53 Q-35 85 -132 105Z" fill="' + colors.hair + '"/>' +
      '<circle cx="-45" cy="130" r="11" fill="#27302E"/><circle cx="45" cy="130" r="11" fill="#27302E"/>' +
      '<path d="M-27 184 Q0 207 27 184" fill="none" stroke="#773F3A" stroke-width="10" stroke-linecap="round"/>' +
      '</g>';
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><g>' + groups.join("") + '</g></svg>';
}

export const KIDS_CHARACTER_RIGS = CHARACTER_RIGS;
export const KIDS_SCENE_PACKS = SCENE_PACKS;
