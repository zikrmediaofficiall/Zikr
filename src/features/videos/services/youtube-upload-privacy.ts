export type YouTubeUploadPrivacy = "public" | "unlisted" | "private";

const ALLOWED_YOUTUBE_UPLOAD_PRIVACY = new Set<YouTubeUploadPrivacy>([
  "public",
  "unlisted",
  "private",
]);

/**
 * ZIKR publishes approved videos publicly by default. Deployments may explicitly
 * choose unlisted/private, while invalid configuration falls back to public.
 */
export function resolveYouTubeUploadPrivacy(value: unknown): YouTubeUploadPrivacy {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_YOUTUBE_UPLOAD_PRIVACY.has(normalized as YouTubeUploadPrivacy)
    ? (normalized as YouTubeUploadPrivacy)
    : "public";
}
