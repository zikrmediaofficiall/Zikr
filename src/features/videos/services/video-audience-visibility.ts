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
  if (!normalized) return missingAsGeneral ? "general" : null;
  if (["kids", "kid", "children", "child"].includes(normalized)) return "kids";
  if (normalized === "general") return "general";
  return null;
}

export function normalizeVideoMarker(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isGeneralAudienceVideoMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return true;
  return normalizeVideoAudience((metadata as Record<string, unknown>).audience) === "general";
}
