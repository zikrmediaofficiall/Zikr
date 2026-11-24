import { hasCompleteKidsVideoSeriesMetadata, isAutomatedKidsVideoApprovalRecorded } from "../../videos/services/video-publish-approval";
import { normalizeVideoAudience, normalizeVideoMarker } from "../../videos/services/video-audience-visibility";

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
  requestAudience: unknown;
  queueAudience: unknown;
  queueKidsContentQaStatus: unknown;
  expectedApprovalSnapshotHash: string | null;
  row: VideoCatalogPublicationRow | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeAudience(value: unknown): "kids" | "general" | null {
  return normalizeVideoAudience(value, false);
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



/**
 * Social publishing must not race the site's content-publishing queue. A
 * generated video is eligible only after its catalog row is public and its
 * durable media/QA metadata still matches the queue item. Kids require both
 * automated QA markers and a matching source-locked automated QA approval before external delivery.
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
  const requestAudience = input.requestAudience == null ? "general" : normalizeAudience(input.requestAudience);
  const queueAudience = input.queueAudience == null ? null : normalizeAudience(input.queueAudience);
  if (!audience || (input.queueAudience != null && !queueAudience)) {
    return { status: "blocked", reason: "The video catalog or queue audience is invalid." };
  }
  if (!requestAudience) {
    return { status: "blocked", reason: "The generation request audience is missing or invalid." };
  }
  if (requestAudience !== audience) {
    return { status: "blocked", reason: "The generation request audience does not match the published video catalog audience." };
  }
  if (queueAudience && queueAudience !== requestAudience) {
    return { status: "blocked", reason: "The queue audience does not match the generation request audience." };
  }
  if (requestAudience === "kids" && queueAudience !== "kids") {
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
  if (!automatedVideoQa || normalizeVideoMarker(automatedVideoQa.status) !== "passed") {
    return { status: "blocked", reason: "The public video catalog does not contain a passed automated QA snapshot." };
  }
  const expectedApprovalSnapshotHash = input.expectedApprovalSnapshotHash?.trim() ?? "";
  if (!expectedApprovalSnapshotHash || automatedVideoQa.snapshotHash !== expectedApprovalSnapshotHash) {
    return { status: "blocked", reason: "The catalog automated QA snapshot does not match the current generation request." };
  }

  if (audience === "kids") {
    if (normalizeVideoMarker(input.queueKidsContentQaStatus) !== "passed" || normalizeVideoMarker(metadata.kidsVideoQaStatus) !== "passed") {
      return { status: "blocked", reason: "Kids video QA is not passed in both the queue and public catalog." };
    }
    if (!isAutomatedKidsVideoApprovalRecorded(metadata, expectedApprovalSnapshotHash)) {
      return { status: "blocked", reason: "Kids videos require a complete automated QA approval bound to the current media fingerprint." };
    }
    if (!hasCompleteKidsVideoSeriesMetadata(metadata)) {
      return { status: "blocked", reason: "Kids video series metadata is incomplete in the public catalog." };
    }
  }

  return { status: "approved" };
}
