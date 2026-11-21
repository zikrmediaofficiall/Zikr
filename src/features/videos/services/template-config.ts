export const VIDEO_TEMPLATE_ASSETS = [
  "calm", "dawn", "emerald", "gold", "night", "paper", "rose",
  "andalusian-arch", "midnight-skyline", "oasis-dawn",
  "lantern-glow", "geometric-mosaic", "moonlit-sea", "desert-caravan", "olive-grove", "manuscript-library",
  "kids-garden", "kids-nature", "kids-neighborhood", "kids-workshop",
] as const;

export type VideoTemplateAsset = (typeof VIDEO_TEMPLATE_ASSETS)[number];
export type VideoTemplateAudience = "general" | "kids";
export type VideoTemplateFontPreset = "auto" | "naskh" | "sans";
export type VideoTemplatePalette = "template" | "gold" | "emerald" | "monochrome";
export type VideoTemplateSafeArea = "standard" | "wide";
export type VideoTemplateCaptionStyle = "classic" | "minimal" | "boxed";
export type VideoTemplateSourceCardStyle = "standard" | "compact";
export type VideoTemplateAudioPolicy = "allow-tts" | "verified-audio-only";

export type VideoTemplateConfig = {
  assetKey: VideoTemplateAsset;
  defaultFormat: "vertical" | "horizontal";
  motion: "slow" | "fade";
  fontPreset: VideoTemplateFontPreset;
  palette: VideoTemplatePalette;
  safeArea: VideoTemplateSafeArea;
  captionStyle: VideoTemplateCaptionStyle;
  sourceCardStyle: VideoTemplateSourceCardStyle;
  audioPolicy: VideoTemplateAudioPolicy;
};

const GENERAL_ASSETS = new Set<VideoTemplateAsset>([
  "calm", "dawn", "emerald", "gold", "night", "paper", "rose",
  "andalusian-arch", "midnight-skyline", "oasis-dawn",
  "lantern-glow", "geometric-mosaic", "moonlit-sea", "desert-caravan", "olive-grove", "manuscript-library",
]);
const KIDS_ASSETS = new Set<VideoTemplateAsset>([
  "kids-garden", "kids-nature", "kids-neighborhood", "kids-workshop",
]);

const DEFAULT_TEMPLATE_OPTIONS = {
  fontPreset: "auto",
  palette: "template",
  safeArea: "standard",
  captionStyle: "classic",
  sourceCardStyle: "standard",
  audioPolicy: "allow-tts",
} as const;

export function parseVideoTemplateConfig(value: unknown): VideoTemplateConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!VIDEO_TEMPLATE_ASSETS.includes(candidate.assetKey as VideoTemplateAsset)) return null;
  if (candidate.defaultFormat !== "vertical" && candidate.defaultFormat !== "horizontal") return null;
  if (candidate.motion !== "slow" && candidate.motion !== "fade") return null;

  const fontPreset = candidate.fontPreset ?? DEFAULT_TEMPLATE_OPTIONS.fontPreset;
  const palette = candidate.palette ?? DEFAULT_TEMPLATE_OPTIONS.palette;
  const safeArea = candidate.safeArea ?? DEFAULT_TEMPLATE_OPTIONS.safeArea;
  const captionStyle = candidate.captionStyle ?? DEFAULT_TEMPLATE_OPTIONS.captionStyle;
  const sourceCardStyle = candidate.sourceCardStyle ?? DEFAULT_TEMPLATE_OPTIONS.sourceCardStyle;
  const audioPolicy = candidate.audioPolicy ?? DEFAULT_TEMPLATE_OPTIONS.audioPolicy;

  if (fontPreset !== "auto" && fontPreset !== "naskh" && fontPreset !== "sans") return null;
  if (palette !== "template" && palette !== "gold" && palette !== "emerald" && palette !== "monochrome") return null;
  if (safeArea !== "standard" && safeArea !== "wide") return null;
  if (captionStyle !== "classic" && captionStyle !== "minimal" && captionStyle !== "boxed") return null;
  if (sourceCardStyle !== "standard" && sourceCardStyle !== "compact") return null;
  if (audioPolicy !== "allow-tts" && audioPolicy !== "verified-audio-only") return null;

  return {
    assetKey: candidate.assetKey as VideoTemplateAsset,
    defaultFormat: candidate.defaultFormat,
    motion: candidate.motion,
    fontPreset,
    palette,
    safeArea,
    captionStyle,
    sourceCardStyle,
    audioPolicy,
  };
}

export function isVideoTemplateAssetAllowedForAudience(
  assetKey: VideoTemplateAsset,
  audience: VideoTemplateAudience,
): boolean {
  return audience === "kids" ? KIDS_ASSETS.has(assetKey) : GENERAL_ASSETS.has(assetKey);
}

export function videoTemplateAssetPath(
  assetKey: VideoTemplateAsset,
  audience: VideoTemplateAudience,
): string | null {
  if (!isVideoTemplateAssetAllowedForAudience(assetKey, audience)) return null;
  return `public/video/templates/${assetKey}.svg`;
}

export function videoTemplateScene(assetKey: VideoTemplateAsset): "calm" | "dawn" | "emerald" | "gold" | "night" | "paper" | "rose" {
  if (assetKey === "andalusian-arch") return "emerald";
  if (assetKey === "midnight-skyline") return "night";
  if (assetKey === "oasis-dawn" || assetKey === "desert-caravan") return "dawn";
  if (assetKey === "lantern-glow") return "gold";
  if (assetKey === "geometric-mosaic" || assetKey === "olive-grove") return "emerald";
  if (assetKey === "moonlit-sea") return "night";
  if (assetKey === "manuscript-library") return "paper";
  return GENERAL_ASSETS.has(assetKey) ? assetKey as ReturnType<typeof videoTemplateScene> : "calm";
}
