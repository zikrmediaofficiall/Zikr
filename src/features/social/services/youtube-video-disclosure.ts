type YouTubeVideoDisclosureInput = {
import { normalizeVideoAudience, normalizeVideoMarker } from "../../videos/services/video-audience-visibility";
  content: unknown;
  provider?: unknown;
  queueMetadata?: unknown;
  contentType?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Prefer the canonical generation request, but retain the queue audience marker
 * for older Kids rows whose content JSON predates the audience field. Unknown
 * providers are disclosed conservatively; only the local template renderer is
 * excluded from the synthetic-media flag.
 */
export function resolveYouTubeVideoDisclosure(input: YouTubeVideoDisclosureInput): {
  selfDeclaredMadeForKids: boolean;
  containsSyntheticMedia: boolean;
} {
  const content = asRecord(input.content);
  const queueMetadata = asRecord(input.queueMetadata);
  const contentType = typeof input.contentType === "string"
    ? input.contentType.trim().toLowerCase()
    : "";
  const isKidsContentType = contentType === "kids" || contentType.startsWith("kids_");
  const isKidsPublicPath = [content.publicPath, queueMetadata.publicPath].some((value) =>
    typeof value === "string" && (value === "/kids" || value.startsWith("/kids/")),
  );
  const sourceType = normalizeVideoMarker(content.sourceType);
  const aiMode = normalizeVideoMarker(content.aiMode);
  const audience =
    normalizeVideoAudience(content.audience, false) === "kids" ||
    normalizeVideoAudience(queueMetadata.audience, false) === "kids" ||
    isKidsContentType ||
    isKidsPublicPath ||
    sourceType === "original_kids_fiction" ||
    aiMode === "original_kids_story"
      ? "kids"
      : normalizeVideoAudience(content.audience, false) === "general" || normalizeVideoAudience(queueMetadata.audience, false) === "general"
        ? "general"
        : null;
  const contentProvider = typeof content.aiProvider === "string"
    ? content.aiProvider.trim()
    : "";
  const storedProvider = typeof input.provider === "string"
    ? input.provider.trim()
    : "";
  const provider = contentProvider || storedProvider;

  return {
    selfDeclaredMadeForKids: audience === "kids",
    containsSyntheticMedia: provider !== "template",
  };
}
