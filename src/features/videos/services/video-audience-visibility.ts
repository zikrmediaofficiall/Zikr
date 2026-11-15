export type VideoAudience = "general" | "kids";

/**
 * Normalizes audience markers at trust boundaries. Missing audience remains
 * backward-compatible with legacy general videos; unknown non-empty values
 * return null so approval and publication paths fail closed.
 */
export function normalizeVideoAudience(
  value: unknown,
  missingAsGeneral = true,
): VideoAudience | null {
  if (value === null || value === undefined) {
    return missingAsGeneral ? "general" : null;
  }
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["kids", "kid", "children", "child"].includes(normalized)) return "kids";
  if (normalized === "general") return "general";
  return null;
}

export function normalizeVideoMarker(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Explicit metadata markers that identify child-directed video content. */
export function hasExplicitKidsVideoIntentMarker(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const audience = normalizeVideoMarker(record.audience);
  if (["kids", "kid", "children", "child"].includes(audience)) return true;

  const sourceType = normalizeVideoMarker(record.sourceType);
  if (["original_kids_fiction", "kids_story", "kids_story_episode"].includes(sourceType)) return true;

  const aiMode = normalizeVideoMarker(record.aiMode);
  if (aiMode === "original_kids_story") return true;

  const type = normalizeVideoMarker(record.type);
  const contentType = normalizeVideoMarker(record.contentType);
  if (["kids_story", "kids_story_episode", "kids_video", "kids_story_video"].includes(type) ||
      ["kids_video", "kids_story_video"].includes(contentType)) return true;

  if (normalizeVideoMarker(record.generationMode) === "free_deterministic_story_factory") return true;

  const sourceId = normalizeVideoMarker(record.sourceId ?? record.curatedSourceId);
  if (sourceId.startsWith("kids-series:")) return true;

  const publicPath = normalizeVideoMarker(record.publicPath);
  return publicPath === "/kids" || publicPath.startsWith("/kids/");
}

/** Legacy Kids story rows predate the explicit audience field. */
export function isLegacyKidsVideoStoryShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.audience === undefined &&
    normalizeVideoMarker(record.sourceType) === "story" &&
    normalizeVideoMarker(record.type) === "story";
}

export function isKidsVideoContentMarker(value: unknown): boolean {
  return hasExplicitKidsVideoIntentMarker(value) || isLegacyKidsVideoStoryShape(value);
}

export function isGeneralAudienceVideoMetadata(metadata: unknown): boolean {
  if (metadata === null || metadata === undefined) return true;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  if (isKidsVideoContentMarker(record)) return false;
  if (record.generator === "zikr_internal_video_factory" && (record.audience === null || record.audience === undefined)) {
    return false;
  }
  return normalizeVideoAudience(record.audience) === "general";
}
