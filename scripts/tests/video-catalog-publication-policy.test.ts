import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateVideoCatalogPublication } from "../../src/features/social/services/video-catalog-publication-policy";
import { clearRevalidatedSocialApprovalDeferrals } from "../../src/features/social/services/social-publish-recovery-policy";

const videoUrl = "https://res.cloudinary.com/zikr/video/upload/v123/auto-kids-episode.mp4";
const kidsMetadata = {
  generator: "zikr_internal_video_factory",
  videoGenerationRequestId: "request-1",
  generatedVideoUrl: videoUrl,
  mediaState: "cloudinary_master",
  audience: "kids",
  kidsVideoQaStatus: "passed",
  automatedVideoQa: { status: "passed" },
  seriesId: "salim-nour",
  seriesTitle: "Salim and Nour",
  seasonNumber: 1,
  episodeNumber: 1,
  learningObjective: "Practice kindness and cooperation",
};
const kidsRow = { published: true, metadata: kidsMetadata };
const kidsInput = {
  contentId: "request-1",
  queuedVideoUrl: videoUrl,
  queueAudience: "kids",
  queueKidsContentQaStatus: "passed",
  row: kidsRow,
};

assert.equal(evaluateVideoCatalogPublication(kidsInput).status, "approved");
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
assert.equal(evaluateVideoCatalogPublication({ ...kidsInput, queuedVideoUrl: "https://example.com/video.mp4" }).status, "blocked");
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
assert.equal(evaluateVideoCatalogPublication({
  contentId: "request-1",
  queuedVideoUrl: videoUrl,
  queueAudience: "general",
  queueKidsContentQaStatus: null,
  row: { published: true, metadata: generalMetadata },
}).status, "approved");

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

const socialSource = readFileSync("src/features/social/services/social-publishing.ts", "utf8");
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
console.log("Social video catalog publication and Kids QA gates passed.");
