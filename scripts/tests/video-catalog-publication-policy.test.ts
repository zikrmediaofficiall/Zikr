import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isGeneralAudienceVideoMetadata } from "../../src/features/videos/services/video-audience-visibility";
import { evaluateVideoCatalogPublication } from "../../src/features/social/services/video-catalog-publication-policy";
import { clearRevalidatedSocialApprovalDeferrals, shouldScheduleSocialPublishRetry } from "../../src/features/social/services/social-publish-recovery-policy";

const videoUrl = "https://res.cloudinary.com/zikr/video/upload/v123/auto-kids-episode.mp4";
const kidsMetadata = {
  generator: "zikr_internal_video_factory",
  videoGenerationRequestId: "request-1",
  generatedVideoUrl: videoUrl,
  mediaState: "cloudinary_master",
  audience: "kids",
  kidsVideoQaStatus: "passed",
  contentFormat: "series_episode",
  aiMode: "original_kids_story",
  sourceType: "original_kids_fiction",
  automatedVideoQa: {
    status: "passed",
    engine: "zikr_video_factory",
    engineVersion: "2026-11-07-auto-qa-v1",
    snapshotHash: "a".repeat(64),
    checks: { sourceVerified: true, audioReviewed: true, visualsReviewed: true, captionsReviewed: true, rightsReviewed: true },
  },
  approvalStatus: "approved",
  approvalReviewerId: "system:zikr-video-factory",
  approvalReviewedAt: "2026-11-14T12:00:00.000Z",
  approvalSnapshotHash: "a".repeat(64),
  qualityReview: {
    sourceVerified: true,
    audioReviewed: true,
    visualsReviewed: true,
    captionsReviewed: true,
    rightsReviewed: true,
    reviewedAt: "2026-11-14T12:00:00.000Z",
    mode: "automated",
    reviewerId: "system:zikr-video-factory",
    engine: "zikr_video_factory",
    engineVersion: "2026-11-07-auto-qa-v1",
    snapshotHash: "a".repeat(64),
  },
  seriesId: "salim-nour",
  seriesTitle: "Salim and Nour",
  seasonNumber: 1,
  episodeNumber: 1,
  learningObjective: "Practice kindness and cooperation",
};
const kidsRow = { published: true, metadata: kidsMetadata };
const kidsInput = {
  contentId: "request-1",
  requestAudience: "kids",
  queuedVideoUrl: videoUrl,
  queueAudience: "kids",
  queueKidsContentQaStatus: "passed",
  expectedApprovalSnapshotHash: "a".repeat(64),
  row: kidsRow,
};

assert.equal(evaluateVideoCatalogPublication(kidsInput).status, "approved");
const mismatchedRequestAudienceInput = { ...kidsInput, requestAudience: "general" };
const requestAudienceMismatch = evaluateVideoCatalogPublication(mismatchedRequestAudienceInput);
assert.equal(requestAudienceMismatch.status, "blocked",
  "a general generation request must not be dispatched through a Kids queue/catalog row");
if (requestAudienceMismatch.status === "blocked") {
  assert.equal(requestAudienceMismatch.reason, "The generation request audience does not match the published video catalog audience.");
}
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  queueAudience: " children ",
  queueKidsContentQaStatus: " PASSED ",
  row: { published: true, metadata: {
    ...kidsMetadata,
    audience: " KIDS ",
    kidsVideoQaStatus: " PASSED ",
  } },
}).status, "approved", "catalog and queue must share normalized Kids audience and QA markers");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, sourceType: undefined } },
}).status, "blocked", "catalog must enforce the complete Kids series-episode source contract");

assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: {
    ...kidsMetadata,
    approvalReviewerId: "system:zikr-video-factory",
    qualityReview: { ...kidsMetadata.qualityReview, mode: "automated" },
  } },
}).status, "approved", "a complete current automated QA result is sufficient for Kids delivery without a human reviewer");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, approvalSnapshotHash: "b".repeat(64) } },
}).status, "blocked", "catalog automated QA approval must match the current request snapshot");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, automatedVideoQa: { status: "passed", snapshotHash: "b".repeat(64) } } },
}).status, "blocked", "catalog automated QA must match the current request snapshot");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: {
    ...kidsMetadata,
    qualityReview: { ...kidsMetadata.qualityReview, snapshotHash: "b".repeat(64) },
  } },
}).status, "blocked", "the catalog QA snapshot must match the current source and media fingerprint");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, row: null }).status, "pending");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, row: { ...kidsRow, published: false } }).status, "pending");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, queueKidsContentQaStatus: null }).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, kidsVideoQaStatus: "blocked" } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, automatedVideoQa: { status: "failed" } } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, audience: "general" } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, queueAudience: "general" }).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, generatedVideoUrl: "https://res.cloudinary.com/zikr/video/upload/v123/other.mp4" } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, mediaState: "youtube_fallback" } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({
  ...kidsInput,
  row: { published: true, metadata: { ...kidsMetadata, episodeNumber: 0 } },
}).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, queuedVideoUrl: "https://res.cloudinary.com/zikr/image/upload/v123/not-a-video.jpg" }).status, "blocked");
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, queueAudience: "other" }).status, "blocked");

const generalMetadata: Record<string, unknown> = {
  ...kidsMetadata,
  audience: "general",
  kidsVideoQaStatus: null,
};
delete generalMetadata.seriesId;
delete generalMetadata.seriesTitle;
delete generalMetadata.seasonNumber;
delete generalMetadata.episodeNumber;
delete generalMetadata.learningObjective;
const generalInput = {
  contentId: "request-1",
  requestAudience: "general",
  queuedVideoUrl: videoUrl,
  queueAudience: "general",
  queueKidsContentQaStatus: null,
  expectedApprovalSnapshotHash: "a".repeat(64),
  row: { published: true, metadata: generalMetadata },
};
assert.equal(evaluateVideoCatalogPublication(generalInput).status, "approved");
const legacyGeneralInput = { ...generalInput, requestAudience: undefined };
assert.equal(evaluateVideoCatalogPublication(legacyGeneralInput).status, "approved",
  "legacy general requests without an audience marker remain general when queue and catalog are general");
const missingKidsAudienceInput = { ...kidsInput, requestAudience: undefined };
assert.equal(evaluateVideoCatalogPublication(missingKidsAudienceInput).status, "blocked",
  "a Kids catalog row must not inherit the legacy general-audience default");

const cleared = clearRevalidatedSocialApprovalDeferrals({
  videoCatalogApprovalBlocked: true,
  videoCatalogPublicationPending: true,
  videoCatalogApprovalReason: "pending",
  videoCatalogPublicationRetryAt: "2026-11-14T12:00:00.000Z",
}, ["youtube"]);
assert.equal(cleared.videoCatalogApprovalBlocked, false);
assert.equal(cleared.videoCatalogPublicationPending, false);
assert.equal(cleared.videoCatalogApprovalReason, null);
assert.equal(cleared.videoCatalogPublicationRetryAt, null);

assert.equal(
  shouldScheduleSocialPublishRetry({
    facebookReelsNextAllowedAt: "2026-11-14T12:00:00.000Z",
    hasDeferredTargets: true,
    videoCatalogApprovalBlocked: true,
    videoCatalogPublicationPending: false,
    retryableOperationalFailures: true,
    hasTransientFailure: true,
    hasSuccesses: true,
  }),
  false,
  "a catalog-level block must suppress every automatic retry, including retries caused by another target's success, transient failure, or cooldown",
);
assert.equal(
  shouldScheduleSocialPublishRetry({
    facebookReelsNextAllowedAt: null,
    hasDeferredTargets: false,
    videoCatalogApprovalBlocked: false,
    videoCatalogPublicationPending: true,
    retryableOperationalFailures: false,
    hasTransientFailure: false,
    hasSuccesses: false,
  }),
  true,
  "a pending catalog publication remains eligible for bounded automatic revalidation",
);
assert.equal(
  shouldScheduleSocialPublishRetry({
    facebookReelsNextAllowedAt: null,
    hasDeferredTargets: false,
    videoCatalogApprovalBlocked: false,
    videoCatalogPublicationPending: false,
    retryableOperationalFailures: true,
    hasTransientFailure: false,
    hasSuccesses: true,
  }),
  true,
  "ordinary partial provider success with a retryable failure remains eligible for retry",
);


const socialSource = readFileSync("src/features/social/services/social-publishing.ts", "utf8");
const availabilitySource = readFileSync("src/features/social/services/platform-availability.ts", "utf8");
assert.match(availabilitySource, /videoCatalogApprovalBlocked === true/);
assert.match(socialSource, /videoCatalogApprovalBlocked: true/);
assert.match(socialSource, /videoCatalogPublicationPending: true/);
assert.match(socialSource, /const operationalFailures = failures\.filter\(failure => !failure\.providerCallSkipped && !deferredFailures\.includes\(failure\)\);/);
assert.match(socialSource, /if \(videoCatalogApprovalReason\) errorMessages\.push\(videoCatalogApprovalReason\);/);
assert.match(socialSource, /shouldScheduleSocialPublishRetry\(\{/);
assert.match(socialSource, /requestAudience:\s*requestContent\?\.audience/,
  "catalog publication must compare the queue and catalog audience to the current generation request audience");

const processStart = socialSource.indexOf("async function processSocialPublishItem");
const processCatalogGate = socialSource.indexOf("const videoCatalogApproval = await checkVideoCatalogPublication(item);", processStart);
const processSourceApproval = socialSource.indexOf("const sourceApproval = await checkWrittenPostSourceApproval(item);", processStart);
assert.ok(processStart >= 0 && processCatalogGate > processStart && processCatalogGate < processSourceApproval,
  "the queue must verify catalog publication before continuing to source checks and platform dispatch");
const platformStart = socialSource.indexOf("async function publishPlatform");
const platformCatalogGate = socialSource.indexOf("const catalogApproval = await checkVideoCatalogPublication(item);", platformStart);
const platformProviderCall = socialSource.indexOf("const publication =", platformStart);
assert.ok(platformStart >= 0 && platformCatalogGate > platformStart && platformCatalogGate < platformProviderCall,
  "each platform must revalidate catalog publication immediately before provider dispatch");
assert.match(socialSource, /row\.published !== true/);
assert.match(socialSource, /published=eq\.true/);
const generalVideoMetadataCases: Array<[unknown, boolean, string]> = [
  [null, true, "legacy SQL-null metadata remains a general video"],
  [undefined, true, "missing metadata remains a legacy general video"],
  [{}, true, "legacy metadata without an audience remains general"],
  [{ audience: null }, true, "a null audience remains a legacy general video"],
  [{ generator: "zikr_internal_video_factory" }, false, "internal generated videos must declare an explicit audience"],
  [{ generator: "zikr_internal_video_factory", audience: null }, false, "an internal generated video with a null audience must fail closed"],
  [{ audience: "general" }, true, "the canonical general audience remains visible"],
  [{ audience: "kids" }, false, "Kids audience is excluded from the general catalog"],
  [0, false, "numeric metadata must fail closed instead of becoming a legacy general video"],
  [true, false, "boolean metadata must fail closed instead of becoming a legacy general video"],
  [{ audience: "Kids" }, false, "case-variant Kids audience fails closed"],
  [{ audience: " kids " }, false, "whitespace-variant Kids audience fails closed"],
  [{ audience: "child" }, false, "unknown child audience fails closed"],
  [{ audience: "children" }, false, "unknown children audience fails closed"],
  [{ audience: "" }, false, "an empty audience is not silently treated as general"],
  [["kids"], false, "non-object metadata fails closed"],
  ["kids", false, "non-object metadata fails closed"],
];
for (const [metadata, expected, message] of generalVideoMetadataCases) {
  assert.equal(isGeneralAudienceVideoMetadata(metadata), expected, message);
}
const generalVideoServiceSource = readFileSync("src/features/videos/services/videos.ts", "utf8");
assert.match(generalVideoServiceSource, /metadata->>audience\.eq\.general/);
assert.doesNotMatch(generalVideoServiceSource, /metadata->>audience\.neq\.kids/);
assert.match(generalVideoServiceSource, /isGeneralAudienceVideoMetadata\(row\.metadata\)/);
assert.match(generalVideoServiceSource, /if \(!isGeneralAudienceVideoMetadata\(rows\[0\]\.metadata\)\) return null;/);

console.log("Social video catalog publication and Kids QA gates passed.");
