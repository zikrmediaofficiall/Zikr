const CLOUDINARY_VIDEO_HOST = "res.cloudinary.com";

/**
 * Only the trusted Cloudinary video delivery origin is accepted for server-side
 * social uploads. Queue rows are durable and admin-managed, so validating the
 * host here prevents a bad or compromised row from turning YouTube uploads into
 * arbitrary server-side HTTP fetches (including localhost and cloud metadata IPs).
 */
export function assertCloudinaryVideoUrl(
  videoUrl: string,
  target: string,
  cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME,
): string {
  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    throw new Error(target + " publishing requires an absolute Cloudinary video URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error(target + " publishing requires HTTPS media URLs");
  }
  if (
    parsed.hostname.toLowerCase() !== CLOUDINARY_VIDEO_HOST ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443")
  ) {
    throw new Error(target + " publishing only accepts trusted Cloudinary video assets");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (
    !cloudName?.trim() ||
    segments.length < 4 ||
    segments[0] !== cloudName.trim() ||
    segments[1] !== "video" ||
    segments[2] !== "upload"
  ) {
    throw new Error(target + " publishing requires a /video/upload asset from the configured Cloudinary cloud");
  }

  return parsed.toString();
}


/**
 * Detect a generated MP4 referenced by a pending social queue row.
 * Cloudinary transformation segments may appear before the version and public
 * ID, so the terminal filename is used for the generated "auto-" identity.
 */
export function isGeneratedCloudinaryVideoUrl(value: unknown, cloudName: string): boolean {
  if (typeof value !== "string" || !value.trim() || !cloudName.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== CLOUDINARY_VIDEO_HOST ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443")
    ) {
      return false;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (
      segments.length < 4 ||
      segments[0] !== cloudName ||
      segments[1] !== "video" ||
      segments[2] !== "upload"
    ) {
      return false;
    }

    const fileName = segments.at(-1) ?? "";
    const extensionIndex = fileName.lastIndexOf(".");
    if (extensionIndex <= 0) return false;
    const extension = fileName.slice(extensionIndex + 1).toLowerCase();
    const fileStem = fileName.slice(0, extensionIndex);
    return extension === "mp4" && fileStem.startsWith("auto-");
  } catch {
    return false;
  }
}


/**
 * Resolve the real first-frame poster for a Cloudinary-hosted generated video.
 * The image remains in Cloudinary; this does not create or persist a fake thumbnail.
 */
export const HOOK_FRAME_POSTER_SECONDS = 1.6;

export function isHookFramePosterEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return [env.VIDEO_THUMBNAIL_HOOK_FRAME_ENABLED, env.VIDEO_THUMBNAIL_HOOK_FRAME].some((v) => v === "true" || v === "1");
}

/**
 * Poster for a rendered video. Default is the first frame (so_0), which sits
 * inside the fade-in and is usually dark. With VIDEO_THUMBNAIL_HOOK_FRAME_ENABLED
 * it uses the frame at 1.6s, after the fade-in and while the opening hook line is
 * on screen, so the thumbnail carries the hook text. Same Cloudinary URL
 * validation as the default poster; no upload and no extra network call.
 */
export function resolveVideoPoster(videoUrl: string | null | undefined, env: Record<string, string | undefined> = process.env): string | null {
  const poster = resolveCloudinaryVideoPoster(videoUrl);
  if (!poster || !isHookFramePosterEnabled(env)) return poster;
  return poster.replace("/video/upload/so_0/", "/video/upload/so_" + HOOK_FRAME_POSTER_SECONDS + "/");
}

export function resolveCloudinaryVideoPoster(videoUrl: string | null | undefined): string | null {
  if (typeof videoUrl !== "string" || !videoUrl.trim()) return null;
  try {
    const parsed = new URL(videoUrl.trim());
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== CLOUDINARY_VIDEO_HOST ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443") ||
      !cloudName
    ) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 5 || segments[0] !== cloudName || segments[1] !== "video" || segments[2] !== "upload") return null;
    if (!/\.(mp4|webm|mov|m4v)$/i.test(segments.at(-1) ?? "")) return null;
    const posterPath = parsed.pathname
      .replace("/video/upload/", "/video/upload/so_0/")
      .replace(/\.(mp4|webm|mov|m4v)$/i, ".jpg");
    return parsed.origin + posterPath;
  } catch {
    return null;
  }
}
