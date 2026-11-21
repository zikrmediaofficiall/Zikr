import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDuplicateVideoOwnerRecoveryFilter, buildDuplicateVideoOwnerVideoUrlFilter, canRecoverDuplicateVideoRender, resolveUniqueDuplicateVideoSiteRecord } from "../../src/features/videos/services/duplicate-video-recovery";
import type { DuplicateVideoHashOwner } from "../../src/features/videos/services/duplicate-video-recovery";
import { calculateDailyVideoQuotaState } from "../../src/features/videos/services/video-automation-quota";
import { buildMissingMediaQueueRecoveryPatch } from "../../src/features/social/services/platform-availability";
import { prepareGeneratedVideoContentForDeletion } from "../../src/features/videos/services/video-request-deletion";

const owner: DuplicateVideoHashOwner = {
  status: "completed",
  video_url: null,
  content_hash: "content-hash-1",
  source_hash: "source-hash-1",
  template_version: "renderer-v4",
  category: "hadith",
};
const candidate = {
  category: "hadith",
  contentHash: "content-hash-1",
  sourceHash: "source-hash-1",
  templateVersion: "renderer-v4",
};

const explicitMissingSiteRecord = resolveUniqueDuplicateVideoSiteRecord([]);
assert.equal(explicitMissingSiteRecord, null, "only a verified empty row array may represent a missing catalog record");
const verifiedSiteRecord = { published: false, metadata: { mediaState: "purged" } };
assert.deepEqual(resolveUniqueDuplicateVideoSiteRecord([verifiedSiteRecord]), verifiedSiteRecord);
assert.throws(() => resolveUniqueDuplicateVideoSiteRecord(null), /unique catalog lookup response/);
assert.throws(() => resolveUniqueDuplicateVideoSiteRecord(undefined), /unique catalog lookup response/);
assert.throws(() => resolveUniqueDuplicateVideoSiteRecord([verifiedSiteRecord, verifiedSiteRecord]), /unique catalog lookup response/);
assert.throws(() => resolveUniqueDuplicateVideoSiteRecord([null]), /invalid catalog row/);
assert.throws(() => resolveUniqueDuplicateVideoSiteRecord([{ published: "unknown", metadata: {} }]), /invalid catalog visibility contract/);


assert.equal(
  buildDuplicateVideoOwnerVideoUrlFilter(null),
  "or=(video_url.is.null,video_url.eq.)",
  "requests without a current media pointer may be claimed only while the pointer remains empty",
);
const staleCloudinaryUrl = "https://res.cloudinary.com/example/video/upload/v123/auto-stale.mp4";
assert.equal(
  buildDuplicateVideoOwnerVideoUrlFilter(staleCloudinaryUrl),
  "or=(video_url.is.null,video_url.eq.,video_url.eq." + encodeURIComponent(staleCloudinaryUrl) + ")",
  "recovery must compare-and-set the exact stale generated Cloudinary pointer",
);
assert.equal(
  buildDuplicateVideoOwnerVideoUrlFilter("https://not-cloudinary.test/video.mp4"),
  "or=(video_url.is.null,video_url.eq.)",
  "unexpected non-Cloudinary URLs must never be included in recovery updates",
);

const duplicateOwnerRevision = "2026-11-11T22:40:00.000Z";
assert.equal(
  buildDuplicateVideoOwnerRecoveryFilter(staleCloudinaryUrl, duplicateOwnerRevision),
  "status=eq.completed&updated_at=eq.2026-11-11T22%3A40%3A00.000Z&or=(video_url.is.null,video_url.eq.,video_url.eq." +
    encodeURIComponent(staleCloudinaryUrl) + ")",
  "canonical recovery must compare-and-set both the exact row revision and the previously stored generated media URL",
);
assert.equal(
  buildDuplicateVideoOwnerRecoveryFilter(null, null),
  null,
  "canonical recovery must fail closed when the selected row revision is missing",
);
assert.equal(
  buildDuplicateVideoOwnerRecoveryFilter(null, "not-a-date"),
  null,
  "canonical recovery must fail closed when the selected row revision is invalid",
);

assert.equal(
  canRecoverDuplicateVideoRender({ owner, candidate, qaApproved: true, siteRecord: null }),
  true,
  "a completed canonical request with no catalog row can reuse a verified render",
);
assert.equal(
  canRecoverDuplicateVideoRender({
    owner,
    candidate,
    qaApproved: true,
    siteRecord: {
      published: false,
      metadata: { mediaState: "purged", mediaPurgedFromPublished: true, generatedVideoUrl: null, videoUrl: null },
    },
  }),
  true,
  "an explicitly purged unpublished catalog row can be restored",
);

assert.equal(
  canRecoverDuplicateVideoRender({
    owner: { ...owner, video_url: "https://res.cloudinary.com/example/video/upload/auto-stale.mp4" },
    candidate,
    qaApproved: true,
    siteRecord: {
      published: false,
      metadata: { mediaState: "purged", mediaPurgedFromPublished: true, generatedVideoUrl: null, videoUrl: null },
    },
  }),
  true,
  "a stale generation URL may be replaced only when the matching catalog row is explicitly purged and unpublished",
);

const reject = (overrides: {
  owner?: Partial<DuplicateVideoHashOwner>;
  candidate?: Partial<typeof candidate>;
  qaApproved?: boolean;
  siteRecord?: { published: boolean | null; metadata: Record<string, unknown> | null } | null;
}, message: string) => {
  assert.equal(
    canRecoverDuplicateVideoRender({
      owner: { ...owner, ...overrides.owner },
      candidate: { ...candidate, ...overrides.candidate },
      qaApproved: overrides.qaApproved ?? true,
      siteRecord: overrides.siteRecord === undefined ? null : overrides.siteRecord,
    }),
    false,
    message,
  );
};

reject({ qaApproved: false }, "failed automated QA must never restore or publish a duplicate render");
reject({ owner: { status: "processing" } }, "an active duplicate owner must not be overwritten");
reject({ owner: { video_url: "https://res.cloudinary.com/example/video/upload/auto-existing.mp4" } }, "an owner with existing media must not be overwritten");
reject({ candidate: { contentHash: "different" } }, "a different final content hash must fail closed");
reject({ candidate: { sourceHash: "different" } }, "a different source hash must fail closed");
reject({ candidate: { templateVersion: "renderer-v5" } }, "a different renderer version must fail closed");
reject({ candidate: { category: "quran" } }, "a different content category must fail closed");
reject({
  siteRecord: { published: true, metadata: { mediaState: "purged" } },
}, "a published catalog record must never be replaced");
reject({
  siteRecord: { published: null, metadata: { mediaState: "purged" } },
}, "an unknown publication state must fail closed");
reject({
  siteRecord: { published: false, metadata: { mediaState: "unpublished" } },
}, "an intentionally unpublished record must not be republished");
reject({
  siteRecord: {
    published: false,
    metadata: { mediaState: "purged", mediaPurgedFromPublished: false, generatedVideoUrl: null, videoUrl: null },
  },
}, "a purged row that was intentionally unpublished before purge must not be republished");
reject({
  siteRecord: {
    published: false,
    metadata: { mediaState: "purged", generatedVideoUrl: null, videoUrl: null },
  },
}, "a purged row without prior-publication evidence must fail closed");
reject({
  owner: { video_url: "https://not-cloudinary.test/video.mp4" },
  siteRecord: {
    published: false,
    metadata: { mediaState: "purged", mediaPurgedFromPublished: true, generatedVideoUrl: null, videoUrl: null },
  },
}, "a non-Cloudinary URL must never be overwritten by generated-media recovery");
reject({
  siteRecord: { published: false, metadata: { mediaState: "purged", videoUrl: "https://not-cloudinary.test/video.mp4" } },
}, "a catalog record retaining a media URL must not be treated as purged");

const canonicalVideoUrl = "https://res.cloudinary.com/zikr/video/upload/v123/auto-canonical.mp4";
const sameAssetPointers = prepareGeneratedVideoContentForDeletion({
  approvalStatus: "awaiting_human_review",
  videoUrl: canonicalVideoUrl,
  generatedVideoUrl: canonicalVideoUrl,
  sourceType: "original",
}, canonicalVideoUrl);
assert.equal(sameAssetPointers.ok, true, "duplicate/cancelled requests may clear only content pointers that exactly match their verified generated MP4");
if (sameAssetPointers.ok) {
  assert.equal("videoUrl" in sameAssetPointers.content, false);
  assert.equal("generatedVideoUrl" in sameAssetPointers.content, false);
  assert.equal(sameAssetPointers.content.approvalStatus, "awaiting_human_review");
}
assert.equal(prepareGeneratedVideoContentForDeletion({ videoUrl: "https://media.example/other.mp4" }, canonicalVideoUrl).ok, false,
  "a different media URL must block deletion rather than being cleared");
assert.equal(prepareGeneratedVideoContentForDeletion({ audioUrl: "https://media.example/audio.mp3" }, canonicalVideoUrl).ok, false,
  "retained narration must block generated-video deletion");
assert.equal(prepareGeneratedVideoContentForDeletion({ thumbnailUrl: "https://media.example/poster.jpg" }, canonicalVideoUrl).ok, false,
  "a separately retained thumbnail must block deletion until its ownership is resolved");
assert.equal(prepareGeneratedVideoContentForDeletion({ videoUrl: canonicalVideoUrl }, "").ok, false,
  "content-only video pointers cannot be deleted without verifying the root generated MP4");

const quotaState = calculateDailyVideoQuotaState([
  { status: "completed", automation_key: "quran:20607:0" },
  { status: "pending", automation_key: "hadith:20607:1" },
  { status: "cancelled", automation_key: "story:20607:2" },
  { status: "failed", automation_key: "dua:20607:3" },
  { status: "retry_wait", automation_key: "adhkar:20607:4" },
  { status: "processing", automation_key: "kids:20607:5" },
]);
assert.deepEqual(
  quotaState,
  { reservedCount: 4, nextSlot: 6 },
  "only active/retryable/completed requests satisfy the daily target while cancelled/failed slot keys remain unavailable",
);
assert.deepEqual(
  calculateDailyVideoQuotaState([
    { status: "cancelled", automation_key: "quran:20607:0" },
    { status: "failed", automation_key: "hadith:20607:1" },
  ]),
  { reservedCount: 0, nextSlot: 2 },
  "terminal duplicate/failure rows must be replaced using a fresh slot rather than consuming the daily quota",
);


const adminVideoDeleteRoute = readFileSync("src/app/api/admin/videos/[id]/route.ts", "utf8");
const generatedCloudinaryAsset = readFileSync("src/features/videos/services/generated-cloudinary-asset.ts", "utf8");
const adminReviewClient = readFileSync("src/features/admin/video-requests/components/admin-video-requests-client.tsx", "utf8");
assert.ok(adminVideoDeleteRoute.includes("requireAdminStepUpApi('video.delete'"));
assert.ok(adminVideoDeleteRoute.includes("duplicateCanonicalId(current)"));
assert.ok(adminVideoDeleteRoute.includes("metadata->>videoGenerationRequestId"));
assert.ok(adminVideoDeleteRoute.includes("social_publish_queue"));
assert.ok(adminVideoDeleteRoute.includes("media_assets"));
assert.ok(adminVideoDeleteRoute.includes("admin_delete_unreferenced_video_generation_request"));
assert.ok(adminVideoDeleteRoute.includes("prepareGeneratedCloudinaryAssetDeletion"));
assert.ok(adminVideoDeleteRoute.includes("sharedCanonicalAsset"), "a duplicate request sharing the canonical MP4 must be deleted without destroying the canonical asset");
assert.ok(adminVideoDeleteRoute.includes("originalContent: requestRow.content"), "failed DB deletion must restore original content metadata and media aliases");
assert.ok(adminReviewClient.includes("eligibleVisible = canDelete") && adminReviewClient.includes("isSafeGeneratedAssetDeletionCandidate(request, canManageKids)"), "bulk deletion must include safe generated-media rows, not only rows without video assets");

assert.ok(adminVideoDeleteRoute.includes("isQaFailedGeneratedVideo"));
assert.ok(adminVideoDeleteRoute.includes("isPendingHumanReviewGeneratedVideo"));
const projectCopyDeleteRoute = readFileSync("src/app/api/admin/videos/[id]/project-copy/route.ts", "utf8");
assert.ok(projectCopyDeleteRoute.includes('requireAdminStepUpApi("video.delete"'), "owner project-copy deletion must require video.delete step-up");
assert.ok(projectCopyDeleteRoute.includes("verifyGeneratedCloudinaryVideo"), "project-copy deletion must verify the exact generated Cloudinary asset");
assert.ok(projectCopyDeleteRoute.includes("deleteVerifiedGeneratedCloudinaryVideo"), "project-copy deletion must physically remove the verified Cloudinary asset");
assert.ok(projectCopyDeleteRoute.includes('createAdminClient().storage.from("videos")'), "project-copy deletion must remove the owned Supabase staging copy");
assert.ok(projectCopyDeleteRoute.includes("video_url: row.video_url === assetUrl && assetUrl !== null ? null : row.video_url"), "project-copy deletion must detach only the exact internal playback URL");
assert.ok(projectCopyDeleteRoute.includes("externalSocialPostsDeleted: false"), "project-copy deletion must preserve external social posts");
assert.ok(projectCopyDeleteRoute.includes("platformPublicationIdsPreserved: true"), "project-copy deletion must preserve external publication IDs");
assert.ok(projectCopyDeleteRoute.includes("socialQueueRowsPreserved: true"), "project-copy deletion must preserve historical social queue rows");
assert.ok(!/youtube\.com\/.*delete|facebook\.com\/.*delete/i.test(projectCopyDeleteRoute), "project-copy deletion must not call social-platform deletion APIs");
assert.ok(adminReviewClient.includes("approveSelectedForPublishing") && adminReviewClient.includes("selectedReviewIds"), "the review screen must support selecting multiple review-ready videos");
assert.ok(adminReviewClient.includes('action: "approve_publish"') && adminReviewClient.includes('"/api/admin/video-generation"'), "bulk review must reuse the guarded existing approval API");
assert.ok(adminReviewClient.includes("batchApprovalChecks") && adminReviewClient.includes("APPROVAL_CHECKS.some"), "bulk review must require the full human checklist");

assert.ok(projectCopyDeleteRoute.includes("matchesVideoAsset && assetUrl !== null && row.video_url === assetUrl ? null : row.video_url"), "staging-copy cleanup must preserve unrelated queue video URLs");
assert.ok(projectCopyDeleteRoute.includes('row.video_url === assetUrl && assetUrl !== null && ["queued"'), "only queued items whose exact video URL is being deleted may be failed");
assert.ok(projectCopyDeleteRoute.includes("byMetadata.length >= 10 || bySlug.length >= 10"), "catalog inventory truncation must stop deletion before mutation");
assert.ok(projectCopyDeleteRoute.includes("resolveVideoRequestAudience(current.content)"), "unknown or conflicting audience markers must fail closed before deletion");
assert.ok(projectCopyDeleteRoute.includes("allowProjectReference: true"), "legacy generated Cloudinary assets may be deleted only when their exact URL is linked to a project request");
assert.ok(projectCopyDeleteRoute.includes("managedVideoStoragePathFromUrl(assetUrl)"), "legacy Supabase video URLs must map to exact project Storage objects");
assert.ok(projectCopyDeleteRoute.includes("catalogReferencesTargetedMedia(catalog, assetUrl, storagePaths)"), "catalog media pointers must be matched to the exact asset");
assert.ok(projectCopyDeleteRoute.includes("storagePathsFromRows(linkedRequests, queueRows, assetUrl, current.id)"), "only storage paths linked to the selected video or its retry marker may be purged");

assert.ok(adminVideoDeleteRoute.includes("terminalGeneratedAsset"), "verified failed and cancelled generated assets must use the same reference-checked deletion preflight");
assert.ok(adminVideoDeleteRoute.includes("approvalStatus=eq.qa_failed"));
assert.ok(adminVideoDeleteRoute.includes("approvalStatus=eq.awaiting_human_review"));
assert.ok(adminVideoDeleteRoute.includes("GENERATED_ASSET_RESTORE_REQUIRED"));
const qaDeletionMigration = readFileSync("supabase/migrations/20261121080000_enable_safe_qa_failed_video_asset_deletion.sql", "utf8");
const pendingReviewDeletionMigration = readFileSync("supabase/migrations/20261121095418_allow_safe_unapproved_review_video_deletion.sql", "utf8");
assert.ok(qaDeletionMigration.includes("request.status = 'completed'"));
assert.ok(qaDeletionMigration.includes("request.content ->> 'approvalStatus' = 'qa_failed'"));
assert.ok(qaDeletionMigration.includes("hashtextextended(p_request_id::text, 741953)"));
assert.ok(qaDeletionMigration.includes("FROM public.videos AS video"));
assert.ok(qaDeletionMigration.includes("FROM public.social_publish_queue AS queue_item"));
assert.ok(pendingReviewDeletionMigration.includes("'awaiting_human_review'"), "only requests awaiting human review may use the completed-request deletion path");
assert.ok(pendingReviewDeletionMigration.includes("COALESCE(request_row.content ->> 'approvalStatus', '')"), "missing approval state must fail closed");
assert.ok(pendingReviewDeletionMigration.includes("FROM public.videos AS video"));
assert.ok(pendingReviewDeletionMigration.includes("FROM public.social_publish_queue AS queue_item"));
assert.ok(pendingReviewDeletionMigration.includes("hashtextextended(p_request_id::text, 741953)"));
assert.ok(pendingReviewDeletionMigration.includes("GRANT EXECUTE ON FUNCTION public.admin_delete_unreferenced_video_generation_request"));

assert.ok(generatedCloudinaryAsset.includes('tags.has("automated")'));
assert.ok(generatedCloudinaryAsset.includes('tags.has("zikr-generated")'));
assert.ok(generatedCloudinaryAsset.includes("/video/destroy"));
assert.ok(generatedCloudinaryAsset.includes("for (let attempt = 0; attempt < 3; attempt += 1)"), "Cloudinary delete must retry transient provider/network failures");
assert.ok(generatedCloudinaryAsset.includes('destroyPayload.result === "not found"'), "Cloudinary deletion must be idempotent for an asset already removed");

assert.ok(adminReviewClient.includes("isSafeGeneratedAssetDeletionCandidate"));
assert.ok(adminReviewClient.includes("isQaFailedGeneratedVideo"));
assert.ok(adminReviewClient.includes("حذف فيديو فشل فحص الجودة وملفه نهائيًا"));
assert.ok(adminReviewClient.includes("حذف الفيديو المكرر وملفه نهائيًا"));
assert.ok(adminReviewClient.includes("request.thumbnail_url"));
assert.ok(adminReviewClient.includes("terminalWithAsset"), "failed and cancelled generated videos must be eligible for guarded per-request deletion");
assert.ok(adminReviewClient.includes("request.stored_thumbnail_url"), "derived preview posters must not be treated as persisted media references when checking deletion eligibility");
assert.ok(adminReviewClient.includes("content.approvalStatus === \"awaiting_human_review\""), "completed unapproved review renders must be available for the guarded deletion action");
assert.ok(adminReviewClient.includes("مراجعة واعتماد"), "the review queue must provide a direct review-and-approve action");
assert.ok(adminReviewClient.includes("حذف نسخة المشروع فقط"), "every row with a project video copy must expose an owner-controlled project-only deletion action");
assert.ok(adminReviewClient.includes("isReadyForHumanApproval(request.content)"), "the visible approval action must require a source-locked QA-passed approval snapshot");
assert.ok(adminReviewClient.includes('record.approvalReviewerId === "system:zikr-video-factory"'), "manual Kids approval must upgrade only a verified system-QA approval, never override failed or incomplete QA");
assert.ok(adminReviewClient.includes('qa.engine === "zikr_video_factory"') && adminReviewClient.includes('qa.engineVersion === "2026-11-07-auto-qa-v1"'), "human approval must be exposed only for the current automated QA engine/version");
assert.ok(adminReviewClient.includes('record.kidsVideoQaStatus === "passed"'), "Kids approval must require a passed Kids-specific QA result before showing the button");
assert.ok(adminReviewClient.includes('normalizeVideoMarker(record.contentFormat) === "series_episode"') && adminReviewClient.includes('normalizeVideoMarker(record.aiMode) === "original_kids_story"') && adminReviewClient.includes('normalizeVideoMarker(record.sourceType) === "original_kids_fiction"'), "Kids approval button must be hidden unless the canonical Kids series provenance is complete");
assert.ok(adminReviewClient.includes("لا يمكن تسجيل اعتماد بشري قبل نجاح فحص الجودة الآلي"), "the details panel must explain why requests without verified automated QA cannot be approved");
assert.ok(adminReviewClient.includes("فتح الطلب الأصلي للمراجعة"));

const worker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
const videoAutomationService = readFileSync("src/features/videos/services/video-automation.ts", "utf8");
const videoRetryRoute = readFileSync("src/app/api/admin/videos/[id]/retry/route.ts", "utf8");
assert.match(videoRetryRoute, /current\.status !== 'failed'/, "only failed video requests may be retried");
assert.match(videoRetryRoute, /updateVideoRequestStatus\(id, 'pending', undefined, 'failed', current\.updated_at\)/, "retry must use a failed-state compare-and-set against the audience-authorized revision");
assert.match(videoAutomationService, /status=eq\.\$\{encodeURIComponent\(expectedStatus\)\}/);
assert.match(videoAutomationService, /updated_at=eq\.\$\{encodeURIComponent\(expectedRowUpdatedAt\)\}/, "retry compare-and-set must include the exact updated_at revision");
assert.match(videoAutomationService, /expectedUpdatedAt && existingRow\.updated_at !== expectedUpdatedAt/, "retry must reject a row whose audience changed after authorization");
const updateStatusStart = videoAutomationService.indexOf("export async function updateVideoRequestStatus");
const metadataStart = videoAutomationService.indexOf("export function generateYoutubeMetadata", updateStatusStart);
const updateStatus = videoAutomationService.slice(updateStatusStart, metadataStart);
assert.match(updateStatus, /if \(!Array\.isArray\(updated\)\)/, "malformed update responses must fail closed");
assert.match(updateStatus, /return updated\.length > 0/, "a valid empty compare-and-set response must remain a conflict");
assert.match(updateStatus, /throw error;/, "database errors must propagate instead of being reported as a compare-and-set conflict");


const recoveredFailed = buildMissingMediaQueueRecoveryPatch({
  item: {
    status: "failed",
    target_platforms: ["facebook_reels"],
    metadata: {
      sourceMediaMissing: true,
      permanentFailure: true,
      permanentFailurePlatforms: ["facebook_reels"],
      platformResults: {
        facebook_reels: {
          ok: false,
          error: "Facebook Reel upload failed (HTTP 422): Meta upload response did not confirm success",
        },
      },
      platformAttempts: { facebook_reels: 5 },
    },
  },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
});
assert.ok(recoveredFailed, "a verified replacement asset may release a source-media-only 422 hold");
assert.equal(recoveredFailed.status, "queued");
assert.equal(recoveredFailed.video_url, "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4");
assert.equal(recoveredFailed.metadata.sourceMediaMissing, false);
assert.equal(recoveredFailed.metadata.permanentFailure, false);
assert.deepEqual(recoveredFailed.metadata.permanentFailurePlatforms, []);
assert.equal((recoveredFailed.metadata.platformResults as Record<string, unknown>).facebook_reels, undefined);
assert.equal((recoveredFailed.metadata.platformAttempts as Record<string, unknown>).facebook_reels, 0);

const recoveredPartial = buildMissingMediaQueueRecoveryPatch({
  item: {
    status: "partial",
    target_platforms: ["youtube", "facebook_reels"],
    metadata: {
      sourceMediaMissing: true,
      permanentFailure: true,
      permanentFailurePlatforms: ["facebook_reels"],
      platformResults: {
        youtube: { ok: true, remoteId: "already-published-youtube-id" },
        facebook_reels: { ok: false, error: "Facebook Reels cooldown is over" },
      },
      platformAttempts: { youtube: 1, facebook_reels: 4 },
    },
  },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
});
assert.ok(recoveredPartial, "a cooldown-held partial item may be released after verified media recovery");
const partialResults = recoveredPartial.metadata.platformResults as Record<string, { remoteId?: string }>;
assert.equal(partialResults.youtube?.remoteId, "already-published-youtube-id", "existing YouTube delivery IDs must be preserved");
assert.equal(partialResults.facebook_reels, undefined, "only the failed Facebook Reels result may be retried");

const heldBase = {
  status: "failed",
  target_platforms: ["facebook_reels"],
  metadata: {
    sourceMediaMissing: true,
    permanentFailure: true,
    permanentFailurePlatforms: ["facebook_reels"],
    platformResults: { facebook_reels: { ok: false, error: "HTTP 422 source media unavailable" } },
  },
};
assert.equal(buildMissingMediaQueueRecoveryPatch({
  item: { ...heldBase, metadata: { ...heldBase.metadata, authBlocked: true } },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
}), null, "auth-blocked queue rows must remain held");
assert.equal(buildMissingMediaQueueRecoveryPatch({
  item: { ...heldBase, metadata: { ...heldBase.metadata, platformResults: { facebook_reels: { ok: false, error: "HTTP 500 timeout", requiresReconciliation: true } } } },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
}), null, "ambiguous provider outcomes must remain held for manual reconciliation");
assert.equal(buildMissingMediaQueueRecoveryPatch({
  item: { ...heldBase, metadata: { ...heldBase.metadata, platformResults: { facebook_reels: { ok: false, error: "caption rejected" } } } },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
}), null, "unrelated permanent provider failures must not be cleared by media recovery");
assert.equal(buildMissingMediaQueueRecoveryPatch({
  item: { ...heldBase, metadata: { ...heldBase.metadata, sourceMediaMissing: false } },
  videoUrl: "https://res.cloudinary.com/example/video/upload/v1/auto-recovered.mp4",
  now: "2026-11-10T14:00:00.000Z",
}), null, "ordinary queue rows must not be changed by missing-media recovery");

const duplicateSkipMarker = 'error_message: "Duplicate generated content; publication skipped"';
const duplicateSkipIndex = worker.indexOf(duplicateSkipMarker);
assert.notEqual(duplicateSkipIndex, -1, "duplicate generated renders must retain a distinct cancellation reason");
const duplicateSkipBlock = worker.slice(duplicateSkipIndex, worker.indexOf("continue;", duplicateSkipIndex));
assert.match(duplicateSkipBlock, /skipped\s*\+=\s*1/);
assert.doesNotMatch(duplicateSkipBlock, /failed\s*\+=\s*1/);
assert.match(worker, /return \{ processed, succeeded, failed, skipped \}/);
const runner = readFileSync("scripts/run-background-jobs.ts", "utf8");
assert.match(runner, /waveSkipped/);
assert.match(runner, /skipped \+= waveSkipped/);
assert.match(runner, /skipped: summary\.skipped/);

assert.match(worker, /automation_key=like\.\*:\$\{day\}:\*&select=id,status,automation_key&limit=1000/);

const dailyQuotaQueryPosition = worker.indexOf("automation_key=like.*:${day}:*&select=id,status,automation_key&limit=1000");
const dailyQuotaCapPosition = worker.indexOf("if ((todaysRows ?? []).length >= 1000)");
const dailyQuotaUsePosition = worker.indexOf("const dailyQuota = calculateDailyVideoQuotaState");
assert.ok(
  dailyQuotaQueryPosition >= 0 &&
    dailyQuotaQueryPosition < dailyQuotaCapPosition &&
    dailyQuotaCapPosition < dailyQuotaUsePosition,
  "daily quota seeding must fail closed before counting or allocating slots from a truncated 1,000-row history",
);

assert.match(worker, /calculateDailyVideoQuotaState\(todaysRows \?\? \[\]\)/);
assert.match(worker, /const slot = dailyQuota\.nextSlot \+ i/);
assert.ok(worker.includes("canRecoverDuplicateVideoRender"), "the video worker must use the recovery decision contract");
assert.ok(worker.includes("resolveUniqueDuplicateVideoSiteRecord(duplicateSiteRows)"), "duplicate recovery must fail closed on malformed catalog lookups");
assert.ok(worker.includes("&select=published,metadata&limit=2"), "duplicate recovery must detect multiple catalog rows instead of silently selecting one");
const duplicateRecoveryFilterCall = worker.indexOf("buildDuplicateVideoOwnerRecoveryFilter(");
const duplicateUrlArgument = worker.indexOf("duplicate.video_url", duplicateRecoveryFilterCall);
const duplicateRevisionArgument = worker.indexOf("duplicate.updated_at", duplicateUrlArgument);
assert.ok(
  duplicateRecoveryFilterCall >= 0 &&
    duplicateUrlArgument > duplicateRecoveryFilterCall &&
    duplicateRevisionArgument > duplicateUrlArgument,
  "canonical recovery must compare-and-set the selected row revision and exact previously stored Cloudinary URL",
);
assert.ok(worker.includes("updated_at, duration,source_hash") || worker.includes("updated_at,duration,source_hash"), "the duplicate owner query must fetch the row revision used by the compare-and-set filter");
assert.ok(worker.includes("&${duplicateRecoveryFilter}"), "canonical recovery must apply the completed-state, row-revision, and media-pointer guards together");
assert.ok(worker.includes("recoverPurgedRecord: true"), "purged canonical records must use the controlled recovery queue path");
assert.ok(worker.includes("restoreMissingMediaSocialQueueItems"), "restored canonical media must release only eligible held social queue rows");
const duplicateCancelIndex = worker.indexOf('await patchProcessingRequestWithLease({\n              status: "cancelled",\n              video_url: null');
const socialQueueReleaseIndex = worker.indexOf(
  "socialQueueRecovery = await restoreMissingMediaSocialQueueItems(",
);
assert.ok(
  duplicateCancelIndex >= 0 && socialQueueReleaseIndex > duplicateCancelIndex,
  "the duplicate request must be cancelled before previously held social queue rows are released through row-level compare-and-set",
);
assert.ok(
  worker.includes('existingQueue.status === "published"'),
  "a previously published internal queue row must be re-queued only for explicit purged-record recovery",
);

console.log("Duplicate video render recovery contract tests passed.");
