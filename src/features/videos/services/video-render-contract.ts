import { MAX_AUTO_VIDEO_SECONDS } from "./render-duration";

export type VideoResolution = "1080x1920" | "1920x1080";

/**
 * Keep the render surface bounded to the two resolutions accepted by the
 * automated-video QA and public publishing contracts. Reject arbitrary
 * dimensions before FFmpeg or an external provider allocates resources.
 */
export function resolveVideoResolution(
  resolution: unknown,
  videoFormat: unknown,
): VideoResolution {
  if (resolution !== undefined && resolution !== null && typeof resolution !== "string") {
    throw new TypeError("Video resolution must be a string.");
  }

  if (videoFormat !== undefined && videoFormat !== null && videoFormat !== "") {
    if (typeof videoFormat !== "string" || !["vertical", "horizontal"].includes(videoFormat.trim().toLowerCase())) {
      throw new TypeError("Video format must be vertical or horizontal.");
    }
  }

  const normalizedResolution = typeof resolution === "string" ? resolution.trim() : "";
  const normalizedFormat = typeof videoFormat === "string" ? videoFormat.trim().toLowerCase() : "";

  if (normalizedResolution) {
    if (normalizedResolution !== "1080x1920" && normalizedResolution !== "1920x1080") {
      throw new RangeError("Unsupported video resolution; use 1080x1920 or 1920x1080.");
    }
    const resolutionFormat = normalizedResolution === "1920x1080" ? "horizontal" : "vertical";
    if (normalizedFormat && normalizedFormat !== resolutionFormat) {
      throw new RangeError("Video resolution does not match the selected video format.");
    }
    return normalizedResolution;
  }

  return normalizedFormat === "horizontal" ? "1920x1080" : "1080x1920";
}

/**
 * The catalog's integer duration must describe the rendered media, not the
 * requested target duration stored on the generation request.
 */
export function resolveVideoCatalogDuration(renderedDuration: unknown): number {
  const duration = Number(renderedDuration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_AUTO_VIDEO_SECONDS) {
    throw new RangeError(
      `Rendered video duration must be a positive number no greater than ${MAX_AUTO_VIDEO_SECONDS} seconds.`,
    );
  }
  return Math.max(1, Math.round(duration));
}
