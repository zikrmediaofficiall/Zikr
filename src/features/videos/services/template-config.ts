export const VIDEO_TEMPLATE_ASSETS = [
  "calm",
  "dawn",
  "emerald",
  "gold",
  "night",
  "paper",
  "rose",
  "andalusian-arch",
  "midnight-skyline",
  "oasis-dawn",
  "desert-caravan",
  "geometric-mosaic",
  "lantern-glow",
  "layl",
  "manuscript-library",
  "moonlit-sea",
  "olive-grove",
  "desert-dusk",
  "coastal-blue",
  "botanical",
  "library",
  "geometric",
  "marble",
  "cinematic",
  "starfield",
  "mountain-dawn",
  "heritage",
  "minimal-studio",
  "rainy-window",
  "watercolor-sky",
  "old-city",
  "desert-rose",
  "mosaic-blue",
  "satin-night",
  "sunlit-arch",
  "olive-branch",
  "minimal-cream",
  "kids-garden",
  "kids-nature",
  "kids-neighborhood",
  "kids-workshop",
  "kids-space",
  "kids-ocean",
  "kids-forest",
  "kids-playground",
  "kids-classroom",
  "kids-adventure",
  "kids-jungle",
  "kids-robotics",
  "kids-animals",
  "kids-weather"
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
  "calm",
  "dawn",
  "emerald",
  "gold",
  "night",
  "paper",
  "rose",
  "andalusian-arch",
  "midnight-skyline",
  "oasis-dawn",
  "desert-caravan",
  "geometric-mosaic",
  "lantern-glow",
  "layl",
  "manuscript-library",
  "moonlit-sea",
  "olive-grove",
  "desert-dusk",
  "coastal-blue",
  "botanical",
  "library",
  "geometric",
  "marble",
  "cinematic",
  "starfield",
  "mountain-dawn",
  "heritage",
  "minimal-studio",
  "rainy-window",
  "watercolor-sky",
  "old-city",
  "desert-rose",
  "mosaic-blue",
  "satin-night",
  "sunlit-arch",
  "olive-branch",
  "minimal-cream"
]);
const KIDS_ASSETS = new Set<VideoTemplateAsset>([
  "kids-garden",
  "kids-nature",
  "kids-neighborhood",
  "kids-workshop",
  "kids-space",
  "kids-ocean",
  "kids-forest",
  "kids-playground",
  "kids-classroom",
  "kids-adventure",
  "kids-jungle",
  "kids-robotics",
  "kids-animals",
  "kids-weather"
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

const TEMPLATE_SCENE_BY_ASSET: Partial<Record<VideoTemplateAsset, "calm" | "dawn" | "emerald" | "gold" | "night" | "paper" | "rose">> = {
  "andalusian-arch": "emerald", "midnight-skyline": "night", "oasis-dawn": "dawn",
  "desert-caravan": "dawn", "geometric-mosaic": "gold", "lantern-glow": "gold", "layl": "night",
  "manuscript-library": "paper", "moonlit-sea": "night", "olive-grove": "emerald",
  "desert-dusk": "night", "coastal-blue": "dawn", botanical: "emerald", library: "paper",
  geometric: "gold", marble: "paper", cinematic: "night", starfield: "night",
  "mountain-dawn": "dawn", heritage: "emerald", "minimal-studio": "calm", "rainy-window": "night",
  "watercolor-sky": "dawn", "old-city": "emerald", "desert-rose": "rose", "mosaic-blue": "gold",
  "satin-night": "night", "sunlit-arch": "dawn", "olive-branch": "emerald", "minimal-cream": "calm",
};
export function videoTemplateScene(assetKey: VideoTemplateAsset): "calm" | "dawn" | "emerald" | "gold" | "night" | "paper" | "rose" {
  return TEMPLATE_SCENE_BY_ASSET[assetKey] ?? (GENERAL_ASSETS.has(assetKey) ? assetKey as ReturnType<typeof videoTemplateScene> : "calm");
}
