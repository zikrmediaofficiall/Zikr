const REQUIRED_KIDS_VIDEO_HUMAN_REVIEW_CHECKS = [
import { normalizeVideoAudience, normalizeVideoMarker } from "./video-audience-visibility";
  "sourceVerified",
  "audioReviewed",
  "visualsReviewed",
  "captionsReviewed",
  "rightsReviewed",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Automated Kids QA is a screening layer, not a visual moderator.
 * External social delivery requires a separate, auditable human approval
 * bound to the exact video fingerprint.
 */
export function hasHumanKidsVideoApproval(value: unknown, expectedSnapshotHash?: string | null): boolean {
  const content = asRecord(value);
  const reviewerId = typeof content?.approvalReviewerId === "string"
    ? content.approvalReviewerId.trim()
    : "";
  const qualityReview = asRecord(content?.qualityReview);
  const approvalReviewedAt = typeof content?.approvalReviewedAt === "string"
    ? Date.parse(content.approvalReviewedAt)
    : Number.NaN;
  const reviewReviewedAt = typeof qualityReview?.reviewedAt === "string"
    ? Date.parse(qualityReview.reviewedAt)
    : Number.NaN;
  const snapshotHash = typeof content?.approvalSnapshotHash === "string"
    ? content.approvalSnapshotHash.trim()
    : "";

  const snapshotMatches = expectedSnapshotHash === undefined
    ? /^[a-f0-9]{64}$/i.test(snapshotHash)
    : typeof expectedSnapshotHash === "string" && snapshotHash === expectedSnapshotHash;

  return normalizeVideoAudience(content?.audience, false) === "kids" &&
    normalizeVideoMarker(content.approvalStatus) === "approved" &&
    reviewerId.length > 0 &&
    reviewerId !== "system:zikr-video-factory" &&
    snapshotMatches &&
    Number.isFinite(approvalReviewedAt) &&
    normalizeVideoMarker(qualityReview?.mode) === "human" &&
    qualityReview.reviewerId === reviewerId &&
    Number.isFinite(reviewReviewedAt) &&
    REQUIRED_KIDS_VIDEO_HUMAN_REVIEW_CHECKS.every((key) => qualityReview[key] === true);
}
