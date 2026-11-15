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

export function isGeneralAudienceVideoMetadata(metadata: unknown): boolean {
  if (metadata === null || metadata === undefined) return true;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  if (record.generator === "zikr_internal_video_factory" && (record.audience === null || record.audience === undefined)) {
    return false;
  }
  return normalizeVideoAudience(record.audience) === "general";
}
