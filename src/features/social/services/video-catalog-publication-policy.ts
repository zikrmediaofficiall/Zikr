export type VideoCatalogPublicationDecision =
  | { status: "approved" }
  | { status: "pending"; reason: string }
  | { status: "blocked"; reason: string };

export type VideoCatalogPublicationRow = {
  published: boolean | null;
  metadata: unknown;
};

export type VideoCatalogPublicationInput = {
  contentId: string | null;
  queuedVideoUrl: string | null;
  queueAudience: unknown;
  queueKidsContentQaStatus: unknown;
  row: VideoCatalogPublicationRow | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeAudience(value: unknown): "kids" | "general" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "kids" || normalized === "general" ? normalized : null;
}

function isTrustedCloudinaryVideoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "res.cloudinary.com" &&
      !parsed.username &&
      !parsed.password &&
      (!parsed.port || parsed.port === "443") &&
      segments.length >= 4 &&
      Boolean(segments[0]) &&
      segments[1] === "video" &&
      segments[2] === "upload";
  } catch {
    return false;
  }
}

function hasCompleteKidsSeriesMetadata(metadata: Record<string, unknown>): boolean {
  return typeof metadata.seriesId === "string" && metadata.seriesId.trim().length > 0 &&
    typeof metadata.seriesTitle === "string" && metadata.seriesTitle.trim().length > 0 &&
    typeof metadata.seasonNumber === "number" && Number.isInteger(metadata.seasonNumber) && metadata.seasonNumber > 0 &&
    typeof metadata.episodeNumber === "number" && Number.isInteger(metadata.episodeNumber) && metadata.episodeNumber > 0 &&
    typeof metadata.learningObjective === "string" && metadata.learningObjective.trim().length > 0;
}

/**
 * Social publishing must not race the site's content-publishing queue. A
 * generated video is eligible only after its catalog row is public and its
 * durable media/QA metadata still matches the queue item. Kids require both
 * the catalog QA result and the queue's explicit Kids QA marker.
 */
export function evaluateVideoCatalogPublication(
  input: VideoCatalogPublicationInput,
): VideoCatalogPublicationDecision {
  const contentId = input.contentId?.trim() ?? "";
  const queuedVideoUrl = input.queuedVideoUrl?.trim() ?? "";
  if (!contentId || !queuedVideoUrl) {
    return { status: "blocked", reason: "The social video queue item is missing its request ID or source URL." };
  }
  if (!input.row) {
    return { status: "pending", reason: "The generated video has not been registered in the public catalog yet." };
  }
  if (input.row.published !== true) {
    return { status: "pending", reason: "The video catalog row is not published yet." };
  }

  const metadata = asRecord(input.row.metadata);
  if (!metadata) return { status: "blocked", reason: "The public video catalog metadata is missing or invalid." };

  const audience = normalizeAudience(metadata.audience);
  const queueAudience = input.queueAudience == null ? null : normalizeAudience(input.queueAudience);
  if (!audience || (input.queueAudience != null && !queueAudience)) {
    return { status: "blocked", reason: "The video catalog or queue audience is invalid." };
  }
  if (queueAudience && queueAudience !== audience) {
    return { status: "blocked", reason: "The queue audience does not match the published video catalog audience." };
  }
  if (audience === "kids" && queueAudience !== "kids") {
    return { status: "blocked", reason: "Kids videos require an explicit Kids audience marker in the social queue." };
  }

  if (metadata.generator !== "zikr_internal_video_factory") {
    return { status: "blocked", reason: "The catalog video is not owned by the internal ZIKR video factory." };
  }
  if (metadata.videoGenerationRequestId !== contentId) {
    return { status: "blocked", reason: "The catalog row does not match the social queue's video generation request." };
  }
  if (metadata.generatedVideoUrl !== queuedVideoUrl || !isTrustedCloudinaryVideoUrl(queuedVideoUrl)) {
    return { status: "blocked", reason: "The catalog's Cloudinary master URL does not match the queued source media." };
  }

  const mediaState = typeof metadata.mediaState === "string" ? metadata.mediaState.trim().toLowerCase() : "";
  if (["purged", "unlinked", "youtube_fallback"].includes(mediaState)) {
    return { status: "blocked", reason: "The Cloudinary master media is retired or unavailable for social upload." };
  }

  const automatedVideoQa = asRecord(metadata.automatedVideoQa);
  if (automatedVideoQa?.status !== "passed") {
    return { status: "blocked", reason: "The public video catalog does not contain a passed automated QA snapshot." };
  }

  if (audience === "kids") {
    if (input.queueKidsContentQaStatus !== "passed" || metadata.kidsVideoQaStatus !== "passed") {
      return { status: "blocked", reason: "Kids video QA is not passed in both the queue and public catalog." };
    }
    if (!hasCompleteKidsSeriesMetadata(metadata)) {
      return { status: "blocked", reason: "Kids video series metadata is incomplete in the public catalog." };
    }
  }

  return { status: "approved" };
}
