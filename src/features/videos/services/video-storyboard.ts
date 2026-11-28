import {
  VIDEO_TEMPLATE_ASSETS,
  isVideoTemplateAssetAllowedForAudience,
  type VideoTemplateAsset,
  type VideoTemplateAudience,
} from "./template-config";

export type VideoStoryboardCameraPath =
  | "center"
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top";

export type VideoStoryboardTransition = "none" | "fade";

export type VideoStoryboardScene = {
  id: string;
  index: number;
  assetKey: VideoTemplateAsset;
  startSeconds: number;
  durationSeconds: number;
  transitionIn: VideoStoryboardTransition;
  cameraPath: VideoStoryboardCameraPath;
  zoomIncrement: number;
};

export type VideoStoryboard = {
  version: "zikr-storyboard-v1";
  requestId: string;
  category: string;
  audience: VideoTemplateAudience;
  totalDurationSeconds: number;
  overlapSeconds: number;
  scenes: VideoStoryboardScene[];
};

export type BuildVideoStoryboardInput = {
  requestId: string;
  category: string;
  audience: VideoTemplateAudience;
  durationSeconds: number;
  templateAssetKey?: VideoTemplateAsset | null;
  visualTheme?: VideoTemplateAsset | null;
};

const CATEGORY_ASSETS: Record<string, readonly VideoTemplateAsset[]> = {
  quran: ["manuscript-library", "andalusian-arch", "geometric-mosaic", "heritage", "paper", "library"],
  hadith: ["library", "manuscript-library", "olive-branch", "heritage", "paper", "old-city"],
  dua: ["moonlit-sea", "lantern-glow", "oasis-dawn", "desert-rose", "rose", "dawn"],
  adhkar: ["olive-grove", "olive-branch", "botanical", "oasis-dawn", "emerald", "minimal-cream"],
  story: ["old-city", "desert-caravan", "heritage", "cinematic", "mountain-dawn", "desert-dusk"],
  other: ["minimal-studio", "calm", "night", "lantern-glow", "paper", "coastal-blue"],
};

const KIDS_CATEGORY_ASSETS: Record<string, readonly VideoTemplateAsset[]> = {
  story: ["kids-adventure", "kids-forest", "kids-nature", "kids-jungle", "kids-animals", "kids-garden"],
  quran: ["kids-garden", "kids-nature", "kids-classroom", "kids-space"],
  hadith: ["kids-classroom", "kids-neighborhood", "kids-garden", "kids-adventure"],
  dua: ["kids-garden", "kids-nature", "kids-ocean", "kids-weather"],
  adhkar: ["kids-garden", "kids-nature", "kids-forest", "kids-weather"],
  other: ["kids-adventure", "kids-workshop", "kids-animals", "kids-space", "kids-ocean", "kids-neighborhood"],
};

const CAMERA_PATHS: readonly VideoStoryboardCameraPath[] = [
  "center",
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top",
];

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function roundedSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sceneCountForDuration(durationSeconds: number): number {
  if (durationSeconds < 6) return 2;
  if (durationSeconds < 13) return 3;
  if (durationSeconds < 26) return 4;
  if (durationSeconds < 46) return 5;
  return 6;
}

function safeAsset(
  value: unknown,
  audience: VideoTemplateAudience,
): value is VideoTemplateAsset {
  return typeof value === "string" &&
    VIDEO_TEMPLATE_ASSETS.includes(value as VideoTemplateAsset) &&
    isVideoTemplateAssetAllowedForAudience(value as VideoTemplateAsset, audience);
}

function orderedAssets(input: BuildVideoStoryboardInput): VideoTemplateAsset[] {
  if (input.templateAssetKey != null && !safeAsset(input.templateAssetKey, input.audience)) {
    throw new Error("Pinned Template Studio asset is not approved for the requested storyboard audience.");
  }
  if (input.visualTheme != null && !safeAsset(input.visualTheme, input.audience)) {
    throw new Error("Requested visual theme is not approved for the requested storyboard audience.");
  }
  const category = input.category.trim().toLowerCase();
  const audienceAssets = VIDEO_TEMPLATE_ASSETS.filter((asset) =>
    isVideoTemplateAssetAllowedForAudience(asset, input.audience),
  );
  const preferred = input.audience === "kids"
    ? (KIDS_CATEGORY_ASSETS[category] ?? KIDS_CATEGORY_ASSETS.other)
    : (CATEGORY_ASSETS[category] ?? CATEGORY_ASSETS.other);
  const primary = safeAsset(input.templateAssetKey, input.audience)
    ? input.templateAssetKey
    : safeAsset(input.visualTheme, input.audience)
      ? input.visualTheme
      : null;
  const combined = [
    ...(primary ? [primary] : []),
    ...preferred.filter((asset) => audienceAssets.includes(asset)),
    ...audienceAssets,
  ];
  return [...new Set(combined)];
}

/**
 * Creates a deterministic visual-only timeline. It deliberately contains no
 * narration, captions, generated copy, or religious text: the approved request
 * text and a single verified audio track remain authoritative in the renderer.
 */
export function buildVideoStoryboard(input: BuildVideoStoryboardInput): VideoStoryboard {
  const requestId = input.requestId.trim();
  const category = input.category.trim().toLowerCase();
  const rawDuration = Number(input.durationSeconds);
  if (!requestId) throw new Error("A stable request ID is required for deterministic storyboard generation.");
  if (!category) throw new Error("A category is required for storyboard generation.");
  if (!Number.isFinite(rawDuration) || rawDuration < 1 || rawDuration > 135) {
    throw new Error("Storyboard duration must be between 1 and 135 seconds.");
  }

  const totalDurationSeconds = roundedSeconds(rawDuration);
  const assets = orderedAssets(input);
  if (assets.length < 2) {
    throw new Error("At least two audience-approved visual assets are required for a multi-scene storyboard.");
  }

  const count = Math.min(sceneCountForDuration(totalDurationSeconds), assets.length, 6);
  const overlapSeconds = roundedSeconds(Math.min(0.35, totalDurationSeconds / (count * 5)));
  const clipDuration = (totalDurationSeconds + overlapSeconds * (count - 1)) / count;
  const seed = requestId + "|" + category + "|" + input.audience;
  const primary = assets[0];
  const additional = assets.slice(1);
  const additionalStart = stableHash(seed + ":asset-order") % Math.max(1, additional.length);
  const ordered = [
    primary,
    ...Array.from({ length: count - 1 }, (_, index) =>
      additional[(additionalStart + index) % additional.length],
    ),
  ];

  const scenes: VideoStoryboardScene[] = ordered.map((assetKey, index) => {
    const startSeconds = index === 0
      ? 0
      : roundedSeconds(index * (clipDuration - overlapSeconds));
    const durationSeconds = index === count - 1
      ? roundedSeconds(totalDurationSeconds - startSeconds)
      : roundedSeconds(clipDuration);
    const cameraIndex = stableHash(seed + ":camera:" + index) % CAMERA_PATHS.length;
    const zoomIndex = stableHash(seed + ":zoom:" + index) % 5;

    return {
      id: requestId + ":visual:" + String(index + 1),
      index,
      assetKey,
      startSeconds,
      durationSeconds,
      transitionIn: index === 0 ? "none" : "fade",
      cameraPath: CAMERA_PATHS[cameraIndex],
      zoomIncrement: Number((0.0001 + zoomIndex * 0.00002).toFixed(6)),
    };
  });

  const lastScene = scenes[scenes.length - 1];
  if (!lastScene || Math.abs(lastScene.startSeconds + lastScene.durationSeconds - totalDurationSeconds) > 0.002) {
    throw new Error("Storyboard timing does not reconcile to the requested video duration.");
  }
  if (scenes.some((scene) => !safeAsset(scene.assetKey, input.audience))) {
    throw new Error("Storyboard contains an asset outside the approved audience catalogue.");
  }

  return {
    version: "zikr-storyboard-v1",
    requestId,
    category,
    audience: input.audience,
    totalDurationSeconds,
    overlapSeconds,
    scenes,
  };
}

function cameraExpressions(scene: VideoStoryboardScene): { x: string; y: string } {
  const frames = Math.max(1, Math.round(scene.durationSeconds * 30));
  const progress = "min(on/" + String(frames) + ",1)";
  const x = (focus: string) => "(iw-iw/zoom)*" + focus;
  const y = (focus: string) => "(ih-ih/zoom)*" + focus;
  switch (scene.cameraPath) {
    case "left-to-right":
      return { x: x("(0.12+0.76*" + progress + ")"), y: y("0.50") };
    case "right-to-left":
      return { x: x("(0.88-0.76*" + progress + ")"), y: y("0.50") };
    case "top-to-bottom":
      return { x: x("0.50"), y: y("(0.12+0.76*" + progress + ")") };
    case "bottom-to-top":
      return { x: x("0.50"), y: y("(0.88-0.76*" + progress + ")") };
    default:
      return { x: x("0.50"), y: y("0.50") };
  }
}

/**
 * Builds the FFmpeg filter graph for silent visual scenes. The final captions
 * and verified audio are applied later by the existing single-pass renderer.
 */
export function buildVideoStoryboardFilterGraph(
  storyboard: VideoStoryboard,
  width: number,
  height: number,
): string {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320 || width > 1920 || height > 1920) {
    throw new Error("Storyboard frame dimensions are outside the supported 320–1920 pixel bounds.");
  }
  if (storyboard.scenes.length < 2 || storyboard.scenes.length > 6) {
    throw new Error("Storyboard must contain between two and six scenes.");
  }

  const filters: string[] = [];
  for (const scene of storyboard.scenes) {
    const focus = cameraExpressions(scene);
    const label = "v" + String(scene.index);
    const zoom = scene.zoomIncrement.toFixed(6);
    filters.push(
      "[" + String(scene.index) + ":v]" +
      "scale=" + width + ":" + height + ":force_original_aspect_ratio=increase," +
      "crop=" + width + ":" + height + ",setsar=1," +
      "zoompan=z='min(zoom+" + zoom + ",1.06)':x='" + focus.x + "':y='" + focus.y +
      "':d=1:s=" + width + "x" + height + ":fps=30," +
      "trim=duration=" + scene.durationSeconds.toFixed(3) + "," +
      "fps=30,settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p[" + label + "]",
    );
  }

  let previous = "v0";
  for (let index = 1; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index];
    const output = "x" + String(index);
    if (scene.transitionIn !== "fade") {
      throw new Error("Only the supported fade transition may be used after the storyboard opening scene.");
    }
    filters.push(
      "[" + previous + "][v" + String(index) + "]" +
      "xfade=transition=fade:duration=" + storyboard.overlapSeconds.toFixed(3) +
      ":offset=" + scene.startSeconds.toFixed(3) + "[" + output + "]",
    );
    previous = output;
  }

  filters.push(
    "[" + previous + "]trim=duration=" + storyboard.totalDurationSeconds.toFixed(3) +
    ",setpts=PTS-STARTPTS,format=yuv420p[storyboard_v]",
  );
  return filters.join(";");
}
