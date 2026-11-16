export type YouTubeUploadPrivacy = "public" | "unlisted" | "private";

const ALLOWED_YOUTUBE_UPLOAD_PRIVACY = new Set<YouTubeUploadPrivacy>([
  "public",
  "unlisted",
  "private",
]);

/**
 * Public uploads must be an explicit deployment choice. Missing or invalid
 * configuration defaults to private, matching .env.example and failing safe.
 */
export function resolveYouTubeUploadPrivacy(value: unknown): YouTubeUploadPrivacy {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_YOUTUBE_UPLOAD_PRIVACY.has(normalized as YouTubeUploadPrivacy)
    ? (normalized as YouTubeUploadPrivacy)
    : "private";
}
