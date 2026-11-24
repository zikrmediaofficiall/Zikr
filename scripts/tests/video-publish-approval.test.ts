import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasSuspiciousReligiousAttribution } from "../../src/features/videos/services/religious-attribution-guard";
import { hasExplicitKidsVideoIntentMarker, isGeneralAudienceVideoMetadata, isKidsVideoContentMarker, normalizeVideoAudience } from "../../src/features/videos/services/video-audience-visibility";
import { isKidsVideoGenerationRequestContent } from "../../src/features/kids/services/kids-video-request-visibility";
import { AUTOMATED_VIDEO_QA_ENGINE, AUTOMATED_VIDEO_QA_VERSION, buildVideoApprovalSnapshotHash, buildVideoApprovalSnapshotHashForRequest, buildVideoCatalogApprovalPatch, createAutomatedVideoQaApproval, hasCompleteKidsVideoSeriesMetadata, hasCompleteVideoApprovalChecklist, inspectVideoQueueItemApproval, inspectVideoQueueItemExternalApproval, isAutomatedKidsVideoApprovalRecorded, isVideoApprovalRecorded, isVideoQueueItemApprovedForPublishing, REQUIRED_VIDEO_APPROVAL_CHECKS, resolveKidsVideoQaStatusForApproval, type VideoApprovalChecklist } from "../../src/features/videos/services/video-publish-approval";
assert.equal(hasSuspiciousReligiousAttribution("قال رسول الله في الحديث"), true, "Arabic attribution phrases must be detected without ASCII word boundaries");
assert.equal(hasSuspiciousReligiousAttribution("رسول الله"), true, "an attribution at end-of-string must be detected");
assert.equal(hasSuspiciousReligiousAttribution("قَالَ رَسُولُ اللَّهِ ﷺ"), true, "Arabic diacritics must not bypass attribution detection");
assert.equal(hasSuspiciousReligiousAttribution("قال تعالى إن الصدق قيمة جميلة"), true);
assert.equal(hasSuspiciousReligiousAttribution("هذا نص تعليمي عام عن الصدق والأمانة"), false);
assert.equal(hasSuspiciousReligiousAttribution("قالرسول الله"), false, "the phrase must not match when attached to a preceding Arabic word");
assert.equal(hasSuspiciousReligiousAttribution("رسول اللهي"), false, "the phrase must not match when followed by another Arabic letter");
assert.equal(hasSuspiciousReligiousAttribution(null), false);
assert.equal(normalizeVideoAudience("family"), null, "unknown audience markers must be rejected at video creation");
assert.equal(normalizeVideoAudience(" KIDS "), "kids", "recognized audience markers must be canonicalized");
assert.equal(normalizeVideoAudience(undefined), "general", "legacy requests without an audience remain general");
assert.equal(hasExplicitKidsVideoIntentMarker({ audience: "general", sourceType: " ORIGINAL_KIDS_FICTION " }), true,
  "explicit Kids provenance must remain a Kids marker even when the stored audience is mislabeled");
assert.equal(hasExplicitKidsVideoIntentMarker({ audience: "general", publicPath: "/%256Bids/story" }), true,
  "nested-encoded Kids public paths must not bypass audience classification");
assert.equal(hasExplicitKidsVideoIntentMarker({ audience: "general", sourceId: "", curatedSourceId: "kids-series:little-good-steps:s1:e1" }), true,
  "an empty primary source ID must not hide a Kids curated source ID");
assert.equal(hasExplicitKidsVideoIntentMarker({ audience: "general", sourceId: "general:story:1", curatedSourceId: "kids-series:little-good-steps:s1:e1" }), true,
  "a general primary source ID must not hide a Kids curated source ID");
assert.equal(isKidsVideoContentMarker({ audience: "general", sourceType: "original_kids_fiction" }), true);
assert.equal(isKidsVideoContentMarker({ sourceType: "story", type: "story" }), true,
  "legacy story requests without an audience must retain the existing Kids classification");
assert.equal(isKidsVideoContentMarker({ audience: "general", sourceType: "story", type: "story" }), false,
  "an explicitly general story must not be reclassified as Kids");
assert.equal(isGeneralAudienceVideoMetadata({ audience: "general", sourceType: "original_kids_fiction" }), false,
  "Kids-marked catalog metadata must never enter the general public feed");
assert.equal(isGeneralAudienceVideoMetadata({ sourceType: "story", type: "story" }), false,
  "legacy story metadata without an audience must remain outside the general public feed");
assert.equal(isGeneralAudienceVideoMetadata({ audience: "general", sourceType: "story", type: "story" }), true);
assert.equal(isKidsVideoGenerationRequestContent({ audience: "general", sourceType: "original_kids_fiction" }), true,
  "Kids provenance must be recognized independently of a conflicting audience marker");
assert.equal(isKidsVideoGenerationRequestContent({ audience: "general", sourceType: "story", type: "story" }), false);

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
  qualityReview: { ...checks, reviewedAt: now, mode: "human", reviewerId: "admin-user-1" },
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
const kidsAutomatedApproval = createAutomatedVideoQaApproval({
  snapshot: kidsSnapshot,
  checks,
  reviewedAt: now,
});
assert.ok(kidsAutomatedApproval, "a complete source-locked Kids QA result must create the automatic approval fixture");
assert.equal(hasCompleteKidsVideoSeriesMetadata(null), false, "null Kids metadata must fail closed");
assert.equal(hasCompleteKidsVideoSeriesMetadata("kids"), false, "primitive Kids metadata must fail closed");
assert.equal(isAutomatedKidsVideoApprovalRecorded(null, kidsSnapshotHash), false, "null automated Kids QA metadata must fail closed");
assert.equal(buildVideoApprovalSnapshotHash({ ...kidsSnapshot, kidsVideoQaStatus: "blocked" }), null);
const completeKidsContent = {
  ...content,
  ...kidsAutomatedApproval,
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
assert.equal(
  inspectVideoQueueItemExternalApproval({
    ...kidsQueueItem,
    request: { ...request, content: null },
  }).approved,
  false,
  "null Kids request content must fail closed without throwing",
);
assert.equal(isVideoQueueItemApprovedForPublishing(kidsQueueItem), true);
const mismatchedKidsIntentRequest = {
  ...request,
  content: { ...content, audience: "general", sourceType: "original_kids_fiction", aiMode: "original_kids_story" },
};
assert.equal(buildVideoApprovalSnapshotHashForRequest(mismatchedKidsIntentRequest), null,
  "a general audience hash must not be generated for content carrying explicit Kids provenance");
const mismatchedKidsIntentApproval = inspectVideoQueueItemApproval({
  ...queueItem,
  request: mismatchedKidsIntentRequest,
});
assert.equal(mismatchedKidsIntentApproval.approved, false,
  "Kids-marked requests with a general audience must fail closed before publishing");
assert.match(mismatchedKidsIntentApproval.reason ?? "", /علامات محتوى الأطفال/);
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
assert.equal(kidsAutomatedApproval?.kidsVideoQaStatus, "passed");
assert.equal(kidsAutomatedApproval?.approvalSnapshotHash, kidsSnapshotHash);
assert.notEqual(buildVideoApprovalSnapshotHashForRequest(request), kidsSnapshotHash,
  "a general-audience request must not reuse a Kids approval fingerprint");
assert.equal(buildVideoApprovalSnapshotHashForRequest({ ...request, content: completeKidsContent }), kidsSnapshotHash,
  "the worker and approval inspector must derive the same request fingerprint for the persisted Kids request");
const kidsAutomatedContent = { ...completeKidsContent, ...kidsAutomatedApproval };
const kidsAutomatedQueueItem = {
  ...kidsQueueItem,
  request: { ...request, content: kidsAutomatedContent },
};
assert.equal(isVideoApprovalRecorded(kidsAutomatedContent, kidsSnapshotHash), true,
  "automated Kids QA remains a valid internal screening record");
assert.equal(isAutomatedKidsVideoApprovalRecorded(kidsAutomatedContent, kidsSnapshotHash), true,
  "the system QA approval is valid when all five checks and the current fingerprint pass");
assert.equal(isAutomatedKidsVideoApprovalRecorded(kidsAutomatedContent, kidsSnapshotHash), true,
  "Kids publication uses the system-authored automated QA record, not a human reviewer identity");
assert.equal(inspectVideoQueueItemApproval(kidsAutomatedQueueItem).approved, true,
  "the internal website publication gate accepts complete automated QA");
assert.equal(inspectVideoQueueItemExternalApproval(kidsAutomatedQueueItem).approved, true,
  "Kids videos may publish externally after complete source-locked automated QA without human approval");
assert.equal(isVideoQueueItemApprovedForPublishing(kidsAutomatedQueueItem), true);
assert.equal(isAutomatedKidsVideoApprovalRecorded({
  ...kidsAutomatedContent,
  automatedVideoQa: { ...(kidsAutomatedContent.automatedVideoQa as Record<string, unknown>), checks: { ...checks, rightsReviewed: false } },
}, kidsSnapshotHash), false, "missing rights QA must fail closed");
assert.equal(isAutomatedKidsVideoApprovalRecorded({
  ...kidsAutomatedContent,
  qualityReview: { ...(kidsAutomatedContent.qualityReview as Record<string, unknown>), reviewedAt: "2026-11-13T12:00:00.000Z" },
}, kidsSnapshotHash), false, "an automated review timestamp different from the approval timestamp must fail closed");
assert.equal(isAutomatedKidsVideoApprovalRecorded({
  ...kidsAutomatedContent,
  automatedVideoQa: { ...(kidsAutomatedContent.automatedVideoQa as Record<string, unknown>), reviewedAt: "2026-11-13T12:00:00.000Z" },
}, kidsSnapshotHash), false, "an automated QA timestamp different from the approval timestamp must fail closed");
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...kidsAutomatedContent, approvalSnapshotHash: "b".repeat(64) } },
}), false, "a stale QA fingerprint must block Kids publishing");
assert.equal(isVideoQueueItemApprovedForPublishing({
  ...kidsQueueItem,
  request: { ...request, content: { ...kidsAutomatedContent, automatedVideoQa: { ...(kidsAutomatedContent.automatedVideoQa as Record<string, unknown>), engineVersion: "old-version" } } },
}), false, "an outdated Kids QA engine must fail closed");
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

const catalogMetadata = {
  ...(kidsAutomatedApproval ?? {}),
  generator: "zikr_internal_video_factory",
  videoGenerationRequestId: "request-1",
  generatedVideoUrl: snapshot.videoUrl,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
  audience: "kids",
  kidsVideoQaStatus: "passed",
  automatedVideoQa: kidsAutomatedApproval?.automatedVideoQa,
  sourceType: "original_kids_fiction",
  contentFormat: "series_episode",
  aiMode: "original_kids_story",
  seriesId: "series-1",
  seriesTitle: "قصص القيم",
  learningObjective: "تعلم الصدق والأمانة",
  seasonNumber: 1,
  episodeNumber: 2,
  approvalSnapshotHash: kidsSnapshotHash,
  mediaState: "cloudinary_master",
  storyText: "قصة تعليمية محفوظة كما هي",
};
const catalogMetadataBeforeApproval = JSON.stringify(catalogMetadata);
const catalogRequestContent = {
  ...completeKidsContent,
  ...kidsAutomatedApproval,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
};
const catalogApprovalInput = {
  metadata: catalogMetadata,
  requestContent: catalogRequestContent,
  requestId: "request-1",
  videoUrl: snapshot.videoUrl,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
  snapshotHash: kidsSnapshotHash!,
  reviewerId: "admin-user-1",
  reviewedAt: now,
  checks,
};
const catalogPatch = buildVideoCatalogApprovalPatch(catalogApprovalInput);
assert.ok(catalogPatch, "a matching, unpurged Kids catalog record must accept an explicit admin approval");
assert.equal(Object.prototype.hasOwnProperty.call(catalogPatch, "published"), false, "manual approval must not bypass the scheduled internal content-publishing queue");
assert.equal(catalogPatch?.metadata.approvalStatus, "approved");
assert.equal(catalogPatch?.metadata.approvalReviewerId, "admin-user-1");
assert.equal((catalogPatch?.metadata.qualityReview as Record<string, unknown>).mode, "human");
assert.equal(catalogPatch?.metadata.storyText, "قصة تعليمية محفوظة كما هي", "catalog approval must preserve existing content metadata");
const mismatchedGeneralSnapshotHash = buildVideoApprovalSnapshotHash({ ...snapshot, audience: "general" });
const mismatchedGeneralCatalogPatch = buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: {
    ...catalogMetadata,
    audience: "general",
    approvalSnapshotHash: mismatchedGeneralSnapshotHash,
    automatedVideoQa: { ...catalogMetadata.automatedVideoQa, snapshotHash: mismatchedGeneralSnapshotHash },
  },
  requestContent: {
    ...catalogRequestContent,
    audience: "general",
    approvalStatus: "approved",
    approvalReviewerId: "admin-user-1",
    approvalReviewedAt: now,
    approvalSnapshotHash: mismatchedGeneralSnapshotHash,
    qualityReview: { ...checks, reviewedAt: now, mode: "human", reviewerId: "admin-user-1" },
  },
  snapshotHash: mismatchedGeneralSnapshotHash!,
});
assert.equal(mismatchedGeneralCatalogPatch, null,
  "a general approval snapshot must not approve catalog metadata carrying explicit Kids provenance");

const kidsSeriesFields = [
  "contentFormat", "aiMode", "sourceType", "seriesId", "seriesTitle",
  "learningObjective", "seasonNumber", "episodeNumber",
];
const legacyCatalogMetadata = Object.fromEntries(
  Object.entries(catalogMetadata).filter(([key]) => !kidsSeriesFields.includes(key)),
);
const legacyRequestContent = Object.fromEntries(
  Object.entries(catalogRequestContent).filter(([key]) => key !== "kidsVideoQaStatus"),
);
const legacyKidsQaStatus = resolveKidsVideoQaStatusForApproval({
  requestContent: legacyRequestContent,
  catalogMetadata: legacyCatalogMetadata,
  requestId: "request-1",
  videoUrl: snapshot.videoUrl,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
});
assert.equal(legacyKidsQaStatus, "passed", "a matching catalog QA record may backfill the missing legacy request QA marker");
const legacyCatalogPatch = buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: legacyCatalogMetadata,
  requestContent: { ...legacyRequestContent, kidsVideoQaStatus: legacyKidsQaStatus },
});
assert.ok(legacyCatalogPatch, "legacy Kids catalog rows may receive series metadata copied from the matching approved request");
assert.equal(legacyCatalogPatch?.metadata.seriesId, "series-1");
assert.equal(legacyCatalogPatch?.metadata.seriesTitle, "قصص القيم");
assert.equal(legacyCatalogPatch?.metadata.kidsVideoQaStatus, "passed");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: legacyCatalogMetadata,
  requestContent: legacyRequestContent,
}), null, "catalog QA must be explicitly reconciled into the request before approval");
assert.equal(resolveKidsVideoQaStatusForApproval({
  requestContent: legacyRequestContent,
  catalogMetadata: { ...legacyCatalogMetadata, kidsVideoQaStatus: "blocked" },
  requestId: "request-1",
  videoUrl: snapshot.videoUrl,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
}), null, "blocked catalog Kids QA must never be promoted");
assert.equal(resolveKidsVideoQaStatusForApproval({
  requestContent: legacyRequestContent,
  catalogMetadata: legacyCatalogMetadata,
  requestId: "different-request",
  videoUrl: snapshot.videoUrl,
  sourceHash: snapshot.sourceHash,
  contentHash: snapshot.contentHash,
  templateVersion: snapshot.templateVersion,
}), null, "catalog QA must be tied to the exact generation request");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...legacyCatalogMetadata, seriesId: "different-series" },
  requestContent: { ...legacyRequestContent, kidsVideoQaStatus: "passed" },
}), null, "conflicting catalog series metadata must fail closed");

assert.equal(JSON.stringify(catalogMetadata), catalogMetadataBeforeApproval, "catalog metadata remains unchanged after approval patch construction");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, videoGenerationRequestId: "different-request" },
}), null, "a different generation request must never update this catalog row");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, generatedVideoUrl: "https://media.example.test/other.mp4" },
}), null, "a catalog row with a different rendered asset must fail closed");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, sourceHash: "different-source" },
}), null, "a catalog row with a different source hash must fail closed");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, kidsVideoQaStatus: "blocked" },
}), null, "Kids catalog approval must require a passed catalog QA result");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  requestContent: { ...catalogRequestContent, kidsVideoQaStatus: "blocked" },
}), null, "Kids catalog approval must require a passed request QA result");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, mediaState: "purged" },
}), null, "manual approval must not restore or expose purged media");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, mediaState: "unlinked" },
}), null, "manual approval must not expose unlinked media");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, sourceMediaMissing: true },
}), null, "manual approval must not expose missing source media");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, approvalSnapshotHash: "different-hash" },
}), null, "catalog approval must reject a stale approval fingerprint");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  metadata: { ...catalogMetadata, automatedVideoQa: { status: "passed", snapshotHash: "b".repeat(64) } },
}), null, "catalog approval must reject stale automated QA metadata even when source fields still match");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  requestContent: { ...catalogRequestContent, approvalStatus: "awaiting_human_review" },
}), null, "manual review must not override a failed or missing automated QA approval");
assert.equal(buildVideoCatalogApprovalPatch({
  ...catalogApprovalInput,
  reviewerId: "system:zikr-video-factory",
}), null, "the system QA identity cannot impersonate an administrator approval");

const normalizedKidsSnapshotHash = buildVideoApprovalSnapshotHash({
  ...kidsSnapshot,
  audience: " KIDS ",
  kidsVideoQaStatus: " PASSED ",
});
assert.equal(normalizedKidsSnapshotHash, kidsSnapshotHash);

const normalizedAutomatedKidsContent = {
  ...kidsAutomatedContent,
  audience: " KIDS ",
  sourceType: " ORIGINAL_KIDS_FICTION ",
  aiMode: " ORIGINAL_KIDS_STORY ",
  contentFormat: " SERIES_EPISODE ",
};
assert.equal(hasCompleteKidsVideoSeriesMetadata(normalizedAutomatedKidsContent), true);
assert.equal(isAutomatedKidsVideoApprovalRecorded(normalizedAutomatedKidsContent, kidsSnapshotHash), true);
assert.equal(
  inspectVideoQueueItemExternalApproval({
    ...kidsQueueItem,
    request: { ...request, content: normalizedAutomatedKidsContent },
  }).approved,
  true,
  "normalized Kids markers must preserve a valid matching source-locked automated QA approval",
);

const unknownAudienceQueueItem = {
  ...kidsQueueItem,
  request: {
    ...request,
    content: { ...kidsAutomatedContent, audience: "family" },
  },
};
assert.equal(
  inspectVideoQueueItemApproval(unknownAudienceQueueItem).approved,
  false,
  "unknown non-empty audience markers must fail closed instead of being treated as general",
);

const adminVideoGenerationRoute = readFileSync("src/app/api/admin/video-generation/route.ts", "utf8");
assert.match(adminVideoGenerationRoute, /normalizeVideoAudience\(currentContent\.audience\)/);
assert.match(adminVideoGenerationRoute, /isKidsVideoContentMarker\(currentContent\)/);
assert.ok(
  adminVideoGenerationRoute.indexOf("isKidsVideoContentMarker(currentContent)") <
    adminVideoGenerationRoute.indexOf("const catalogSlug"),
  "conflicting Kids metadata must be rejected before catalog reads or approval mutations",
);
assert.match(adminVideoGenerationRoute, /isKidsVideoContentMarker\(currentContent\)/);
assert.ok(
  adminVideoGenerationRoute.indexOf("isKidsVideoContentMarker(currentContent)") <
    adminVideoGenerationRoute.indexOf("const catalogSlug"),
  "conflicting Kids metadata must be rejected before catalog reads or approval mutations",
);
assert.doesNotMatch(adminVideoGenerationRoute, /currentContent\.audience === ["']kids["']/);
const adminVideoCreateRoute = readFileSync("src/app/api/admin/videos/create/route.ts", "utf8");
assert.match(adminVideoCreateRoute, /normalizeVideoAudience\(content\.audience\)/);
assert.match(adminVideoCreateRoute, /hasExplicitKidsVideoIntentMarker/);
assert.match(adminVideoCreateRoute, /submittedKidsIntent/);
assert.match(adminVideoCreateRoute, /audience: source\.audience \?\? "general"/);
assert.match(adminVideoCreateRoute, /hasExplicitKidsVideoIntentMarker/);
assert.match(adminVideoCreateRoute, /submittedKidsIntent/);
assert.match(adminVideoCreateRoute, /audience: source\.audience \?\? "general"/);
assert.doesNotMatch(adminVideoCreateRoute, /content\.audience === ["']kids["']/);
const createAudienceGuardIndex = adminVideoCreateRoute.indexOf("const requestedAudience = normalizeVideoAudience(content.audience);");
const createTemplateBranchIndex = adminVideoCreateRoute.indexOf('if (typeof content.templateVersionId === "string"');
const createRequestIndex = adminVideoCreateRoute.indexOf("const result = await createVideoGenerationRequest({");
assert.ok(
  createAudienceGuardIndex >= 0 &&
    createAudienceGuardIndex < createTemplateBranchIndex &&
    createTemplateBranchIndex < createRequestIndex,
  "unknown audience values must be rejected before optional template handling and before request persistence",
);
const createAudienceGuard = adminVideoCreateRoute.slice(createAudienceGuardIndex, createTemplateBranchIndex);
assert.match(createAudienceGuard, /if \(!requestedAudience\)/);
assert.match(createAudienceGuard, /audience: requestedAudience/);
assert.match(createAudienceGuard, /submittedKidsIntent \|\| hasExplicitKidsVideoIntentMarker\(content\)/,
  "Kids provenance must be reconciled before the request is persisted");
const createKidsPermissionGuardIndex = adminVideoCreateRoute.indexOf('if (requestedAudience === "kids")');
assert.ok(
  createKidsPermissionGuardIndex > createAudienceGuardIndex &&
    createKidsPermissionGuardIndex < createTemplateBranchIndex &&
    createKidsPermissionGuardIndex < createRequestIndex,
  "Kids permission must be checked before template resolution and before request persistence",
);
const createKidsPermissionGuard = adminVideoCreateRoute.slice(createKidsPermissionGuardIndex, createRequestIndex);
assert.ok(createKidsPermissionGuard.includes('requireAdminApi("kids.manage")'), "Kids generation must require the separate Kids permission");
assert.ok(createKidsPermissionGuard.includes("kidsAuth.profile.id !== auth.profile.id"), "Kids permission must belong to the same authenticated admin");

assert.match(adminVideoGenerationRoute, /resolveKidsVideoQaStatusForApproval/);
assert.match(adminVideoGenerationRoute, /requestContent: currentContent/);
assert.match(adminVideoGenerationRoute, /kidsVideoQaStatus: verifiedKidsVideoQaStatus/);

console.log("Video publishing approval contract passed.");
