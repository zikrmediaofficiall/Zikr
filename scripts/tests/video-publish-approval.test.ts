import assert from "node:assert/strict";
import { AUTOMATED_VIDEO_QA_ENGINE, AUTOMATED_VIDEO_QA_VERSION, buildVideoApprovalSnapshotHash, createAutomatedVideoQaApproval, hasCompleteVideoApprovalChecklist, inspectVideoQueueItemApproval, isVideoApprovalRecorded, isVideoQueueItemApprovedForPublishing, REQUIRED_VIDEO_APPROVAL_CHECKS, type VideoApprovalChecklist } from "../../src/features/videos/services/video-publish-approval";
const checks: VideoApprovalChecklist = { sourceVerified: true, audioReviewed: true, visualsReviewed: true, captionsReviewed: true, rightsReviewed: true };
const now = "2026-10-21T12:00:00.000Z";
const snapshot = {
  category: "quran",
  sourceHash: "source-sha-256",
  contentHash: "content-sha-256",
  templateVersion: "template-v1",
  videoUrl: "https://media.example.test/approved.mp4",
};
const snapshotHash = buildVideoApprovalSnapshotHash(snapshot);
assert.equal(typeof snapshotHash, "string");
const content = {
  approvalStatus: "approved",
  approvalReviewerId: "admin-user-1",
  approvalReviewedAt: now,
  approvalSnapshotHash: snapshotHash,
  qualityReview: { ...checks, reviewedAt: now },
};
const request = {
  status: "completed",
  category: snapshot.category,
  video_url: snapshot.videoUrl,
  source_hash: snapshot.sourceHash,
  content_hash: snapshot.contentHash,
  template_version: snapshot.templateVersion,
  content,
};
const queueItem = { contentType: "quran_video", contentId: "request-1", queuedVideoUrl: request.video_url, request };
assert.equal(REQUIRED_VIDEO_APPROVAL_CHECKS.length, 5);
assert.equal(hasCompleteVideoApprovalChecklist(checks), true);
assert.equal(hasCompleteVideoApprovalChecklist({ ...checks, rightsReviewed: false }), false);
assert.equal(isVideoApprovalRecorded(content, snapshotHash), true);
assert.equal(isVideoApprovalRecorded({ ...content, approvalReviewedAt: null }, snapshotHash), false);
assert.equal(isVideoApprovalRecorded({ ...content, approvalReviewerId: null }, snapshotHash), false);
assert.equal(isVideoApprovalRecorded(content, "different-snapshot-hash"), false);
assert.equal(buildVideoApprovalSnapshotHash({ ...snapshot, sourceHash: null }), null);
assert.equal(isVideoQueueItemApprovedForPublishing(queueItem), true);

const kidsSnapshot = { ...snapshot, audience: "kids", kidsVideoQaStatus: "passed" };
const kidsSnapshotHash = buildVideoApprovalSnapshotHash(kidsSnapshot);
assert.equal(typeof kidsSnapshotHash, "string");
assert.equal(buildVideoApprovalSnapshotHash({ ...kidsSnapshot, kidsVideoQaStatus: "blocked" }), null);
const completeKidsContent = {
  ...content,
  approvalSnapshotHash: kidsSnapshotHash,
  audience: "kids",
  kidsVideoQaStatus: "passed",
  contentFormat: "series_episode",
  aiMode: "original_kids_story",
  sourceType: "original_kids_fiction",
  seriesId: "series-1",
  seriesTitle: "قصص القيم",
  learningObjective: "تعلم الصدق والأمانة",
  seasonNumber: 1,
  episodeNumber: 2,
};
const kidsQueueItem = {
  ...queueItem,
  contentType: "kids_video",
  request: { ...request, content: completeKidsContent },
};
assert.equal(isVideoQueueItemApprovedForPublishing(kidsQueueItem), true);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...completeKidsContent, kidsVideoQaStatus: "blocked" } },
}), false, "Kids video with blocked safety QA must fail closed");
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...completeKidsContent, kidsVideoQaStatus: undefined } },
}), false, "Kids video without a recorded safety QA result must fail closed");
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...completeKidsContent, audience: "general" } },
}), false, "changing the audience after approval must invalidate the Kids snapshot");
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...completeKidsContent, approvalSnapshotHash: snapshotHash } },
}), false, "a general-audience approval hash must not authorize a Kids video");
assert.equal(
  isVideoQueueItemApprovedForPublishing({
    ...kidsQueueItem,
    request: { ...request, content: { ...completeKidsContent, contentFormat: undefined } },
  }),
  false,
  "Kids videos without the series-episode format must fail closed before external publishing",
);
assert.equal(
  isVideoQueueItemApprovedForPublishing({
    ...kidsQueueItem,
    request: { ...request, content: { ...completeKidsContent, seriesId: "" } },
  }),
  false,
  "Kids videos without complete series metadata must fail closed",
);

assert.equal(inspectVideoQueueItemApproval(queueItem).approved, true);
assert.deepEqual(inspectVideoQueueItemApproval(queueItem).missingChecks, []);

const awaitingReview = inspectVideoQueueItemApproval({
  ...queueItem,
  request: { ...request, content: { ...content, approvalStatus: "awaiting_automated_qa", qualityReview: null } },
});
assert.equal(awaitingReview.approved, false);
assert.equal(awaitingReview.approvalStatus, "awaiting_automated_qa");
assert.match(awaitingReview.reason ?? "", /فحص الجودة الآلي/);
assert.equal(awaitingReview.missingChecks.length, 5);

const missingRights = inspectVideoQueueItemApproval({
  ...queueItem,
  request: { ...request, content: { ...content, qualityReview: { ...checks, rightsReviewed: false, reviewedAt: now } } },
});
assert.equal(missingRights.approved, false);
assert.deepEqual(missingRights.missingChecks, ["rightsReviewed"]);
assert.match(missingRights.reason ?? "", /غير مكتملة/);

const changedMedia = inspectVideoQueueItemApproval({
  ...queueItem,
  queuedVideoUrl: "https://media.example.test/new.mp4",
});
assert.equal(changedMedia.approved, false);
assert.match(changedMedia.reason ?? "", /مختلف/);

assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, contentType: "article" }), true);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: { ...request, status: "processing" } }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, queuedVideoUrl: "https://media.example.test/old.mp4" }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: { ...request, content: { ...content, approvalStatus: "awaiting_human_review" } } }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: { ...request, content: { ...content, qualityReview: { ...checks, sourceVerified: false, reviewedAt: now } } } }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: { ...request, source_hash: "changed-source-hash" } }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: { ...request, content_hash: "changed-content-hash" } }), false);
assert.equal(isVideoQueueItemApprovedForPublishing({ ...queueItem, request: null }), false);

// Unattended publishing still requires a passed, immutable automated QA record.
const unreviewedRequest = {
  status: "completed",
  category: "quran",
  video_url: "https://media.example.test/approved.mp4",
  source_hash: "source-sha-256",
  content_hash: "content-sha-256",
  template_version: "template-v1",
  content: {},
};
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: unreviewedRequest,
}), false);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: { ...unreviewedRequest, status: "processing" },
}), false);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: unreviewedRequest,
  requireApproval: false,
} as Parameters<typeof isVideoQueueItemApprovedForPublishing>[0]), false);

// Automated approval is issued only from a complete source/media fingerprint and all QA checks.
const automatedApproval = createAutomatedVideoQaApproval({
  snapshot,
  checks,
  reviewedAt: now,
});
assert.ok(automatedApproval);
assert.equal(automatedApproval?.approvalStatus, "approved");
assert.equal(automatedApproval?.approvalReviewerId, "system:zikr-video-factory");
assert.equal(
  (automatedApproval?.automatedVideoQa as Record<string, unknown>)?.engine,
  AUTOMATED_VIDEO_QA_ENGINE,
);
assert.equal(
  (automatedApproval?.automatedVideoQa as Record<string, unknown>)?.engineVersion,
  AUTOMATED_VIDEO_QA_VERSION,
);
const automatedRequest = {
  ...request,
  content: automatedApproval,
};
assert.equal(isVideoApprovalRecorded(automatedApproval, snapshotHash), true);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: automatedRequest,
}), true);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: {
    ...automatedRequest,
    content: {
      ...automatedApproval,
      automatedVideoQa: {
        ...(automatedApproval?.automatedVideoQa as Record<string, unknown>),
        status: "blocked",
      },
    },
  },
}), false);
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...queueItem,
  request: {
    ...automatedRequest,
    content: {
      ...automatedApproval,
      qualityReview: {
        ...(automatedApproval?.qualityReview as Record<string, unknown>),
        engineVersion: "old-version",
      },
    },
  },
}), false);
const kidsAutomatedApproval = createAutomatedVideoQaApproval({
  snapshot: kidsSnapshot,
  checks,
  reviewedAt: now,
});
assert.equal(kidsAutomatedApproval?.kidsVideoQaStatus, "passed");
assert.equal(kidsAutomatedApproval?.approvalSnapshotHash, kidsSnapshotHash);
assert.equal(createAutomatedVideoQaApproval({
  snapshot: { ...kidsSnapshot, kidsVideoQaStatus: "blocked" },
  checks,
  reviewedAt: now,
}), null);
assert.equal(createAutomatedVideoQaApproval({
  snapshot,
  checks: { ...checks, rightsReviewed: false },
  reviewedAt: now,
}), null);
assert.equal(createAutomatedVideoQaApproval({
  snapshot,
  checks,
  reviewedAt: "not-a-date",
}), null);

console.log("Video publishing approval contract passed.");
