import { createHash } from "node:crypto";

export const REQUIRED_VIDEO_APPROVAL_CHECKS = ["sourceVerified", "audioReviewed", "visualsReviewed", "captionsReviewed", "rightsReviewed"] as const;
export type VideoApprovalCheck = (typeof REQUIRED_VIDEO_APPROVAL_CHECKS)[number];
export type VideoApprovalChecklist = Record<VideoApprovalCheck, boolean>;

export const AUTOMATED_VIDEO_QA_ENGINE = "zikr_video_factory";
export const AUTOMATED_VIDEO_QA_VERSION = "2026-11-07-auto-qa-v1";
export const AUTOMATED_VIDEO_QA_REVIEWER_ID = "system:zikr-video-factory";
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function isVideoContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  return normalized === "video" || normalized.endsWith("_video") || normalized === "video_generation";
}
export function hasCompleteKidsVideoSeriesMetadata(value: unknown): boolean {
  const content = record(value);
  if (content?.audience !== "kids") return false;
  return content.contentFormat === "series_episode" &&
    content.aiMode === "original_kids_story" &&
    content.sourceType === "original_kids_fiction" &&
    typeof content.seriesId === "string" && Boolean(content.seriesId.trim()) &&
    typeof content.seriesTitle === "string" && Boolean(content.seriesTitle.trim()) &&
    typeof content.learningObjective === "string" && Boolean(content.learningObjective.trim()) &&
    Number.isInteger(Number(content.seasonNumber)) && Number(content.seasonNumber) > 0 &&
    Number.isInteger(Number(content.episodeNumber)) && Number(content.episodeNumber) > 0;
}
export function hasCompleteVideoApprovalChecklist(value: unknown): value is VideoApprovalChecklist {
  const checklist = record(value);
  return REQUIRED_VIDEO_APPROVAL_CHECKS.every((key) => checklist?.[key] === true);
}
export type VideoApprovalSnapshot = {
  category: string;
  sourceHash: string | null;
  contentHash: string | null;
  templateVersion: string | null;
  videoUrl: string | null;
  audience?: string | null;
  kidsVideoQaStatus?: string | null;
};

export function buildVideoApprovalSnapshotHash(snapshot: VideoApprovalSnapshot): string | null {
  const sourceHash = snapshot.sourceHash?.trim();
  const contentHash = snapshot.contentHash?.trim();
  const videoUrl = snapshot.videoUrl?.trim();
  const category = snapshot.category.trim();
  if (!sourceHash || !contentHash || !videoUrl || !category) return null;
  if (snapshot.audience === "kids" && snapshot.kidsVideoQaStatus !== "passed") return null;
  const canonical = JSON.stringify([
    category,
    sourceHash,
    contentHash,
    snapshot.templateVersion?.trim() ?? "",
    videoUrl,
    ...(snapshot.audience === "kids" ? ["kids", snapshot.kidsVideoQaStatus] : []),
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function createAutomatedVideoQaApproval(input: {
  snapshot: VideoApprovalSnapshot;
  checks: VideoApprovalChecklist;
  reviewedAt?: string;
}): Record<string, unknown> | null {
  const snapshotHash = buildVideoApprovalSnapshotHash(input.snapshot);
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (
    !snapshotHash ||
    !hasCompleteVideoApprovalChecklist(input.checks) ||
    !Number.isFinite(Date.parse(reviewedAt))
  ) return null;

  const qualityReview = {
    ...input.checks,
    reviewedAt,
    mode: "automated",
    engine: AUTOMATED_VIDEO_QA_ENGINE,
    engineVersion: AUTOMATED_VIDEO_QA_VERSION,
    snapshotHash,
  };
  return {
    approvalStatus: "approved",
    approvalReviewerId: AUTOMATED_VIDEO_QA_REVIEWER_ID,
    approvalReviewedAt: reviewedAt,
    approvalSnapshotHash: snapshotHash,
    qualityReview,
    ...(input.snapshot.audience === "kids" ? { kidsVideoQaStatus: "passed" } : {}),
    automatedVideoQa: {
      status: "passed",
      engine: AUTOMATED_VIDEO_QA_ENGINE,
      engineVersion: AUTOMATED_VIDEO_QA_VERSION,
      reviewedAt,
      snapshotHash,
      checks: input.checks,
      missingChecks: [],
    },
  };
}

export function buildVideoCatalogApprovalPatch(input: {
  metadata: unknown;
  requestId: string;
  videoUrl: string;
  sourceHash: string | null;
  contentHash: string | null;
  templateVersion: string | null;
  snapshotHash: string;
  reviewerId: string;
  reviewedAt: string;
  checks: VideoApprovalChecklist;
}): { published: true; metadata: Record<string, unknown>; updated_at: string } | null {
  const metadata = record(input.metadata);
  const requestId = input.requestId.trim();
  const videoUrl = input.videoUrl.trim();
  const sourceHash = input.sourceHash?.trim() ?? "";
  const contentHash = input.contentHash?.trim() ?? "";
  const templateVersion = input.templateVersion?.trim() ?? "";
  const snapshotHash = input.snapshotHash.trim();
  const reviewerId = input.reviewerId.trim();
  if (
    !metadata ||
    metadata.generator !== "zikr_internal_video_factory" ||
    metadata.videoGenerationRequestId !== requestId ||
    typeof metadata.generatedVideoUrl !== "string" ||
    metadata.generatedVideoUrl.trim() !== videoUrl ||
    typeof metadata.sourceHash !== "string" ||
    metadata.sourceHash.trim() !== sourceHash ||
    typeof metadata.contentHash !== "string" ||
    metadata.contentHash.trim() !== contentHash ||
    typeof metadata.templateVersion !== "string" ||
    metadata.templateVersion.trim() !== templateVersion ||
    !requestId ||
    !videoUrl ||
    !sourceHash ||
    !contentHash ||
    !templateVersion ||
    !/^[a-f0-9]{64}$/i.test(snapshotHash) ||
    !reviewerId ||
    reviewerId === AUTOMATED_VIDEO_QA_REVIEWER_ID ||
    !Number.isFinite(Date.parse(input.reviewedAt)) ||
    !hasCompleteVideoApprovalChecklist(input.checks) ||
    (metadata.approvalSnapshotHash != null && metadata.approvalSnapshotHash !== snapshotHash)
  ) return null;

  if (metadata.audience !== "kids" && metadata.audience !== "general") return null;
  if (metadata.audience === "kids") {
    const automated = record(metadata.automatedVideoQa);
    if (
      metadata.kidsVideoQaStatus !== "passed" ||
      automated?.status !== "passed" ||
      !hasCompleteKidsVideoSeriesMetadata(metadata)
    ) return null;
  }

  const qualityReview = {
    ...input.checks,
    reviewedAt: input.reviewedAt,
    mode: "human",
    reviewerId,
  };
  return {
    published: true,
    metadata: {
      ...metadata,
      approvalStatus: "approved",
      approvalReviewerId: reviewerId,
      approvalReviewedAt: input.reviewedAt,
      approvalSnapshotHash: snapshotHash,
      qualityReview,
    },
    updated_at: input.reviewedAt,
  };
}

export function isVideoApprovalRecorded(content: unknown, expectedSnapshotHash: string | null): boolean {
  const data = record(content);
  if (data?.approvalStatus !== "approved") return false;
  if (typeof data.approvalReviewerId !== "string" || !data.approvalReviewerId.trim()) return false;
  if (!expectedSnapshotHash || data.approvalSnapshotHash !== expectedSnapshotHash) return false;
  const reviewedAt = typeof data.approvalReviewedAt === "string" ? Date.parse(data.approvalReviewedAt) : Number.NaN;
  if (!Number.isFinite(reviewedAt)) return false;
  const reviewData = record(data.qualityReview);
  if (!hasCompleteVideoApprovalChecklist(reviewData)) return false;
  const review = reviewData as Record<string, unknown>;
  const reviewTimestamp = review.reviewedAt;
  if (typeof reviewTimestamp !== "string" || !Number.isFinite(Date.parse(reviewTimestamp))) return false;

  if (data.approvalReviewerId === AUTOMATED_VIDEO_QA_REVIEWER_ID) {
    const automated = record(data.automatedVideoQa);
    return review.mode === "automated" &&
      review.engine === AUTOMATED_VIDEO_QA_ENGINE &&
      review.engineVersion === AUTOMATED_VIDEO_QA_VERSION &&
      review.snapshotHash === expectedSnapshotHash &&
      automated?.status === "passed" &&
      automated.engine === AUTOMATED_VIDEO_QA_ENGINE &&
      automated.engineVersion === AUTOMATED_VIDEO_QA_VERSION &&
      automated.snapshotHash === expectedSnapshotHash &&
      hasCompleteVideoApprovalChecklist(automated.checks);
  }

  // Existing administrator approvals remain valid for historical records.
  return true;
}
export type VideoPublishRequestSnapshot = {
  status: string;
  category: string;
  video_url: string | null;
  source_hash: string | null;
  content_hash: string | null;
  template_version: string | null;
  content: unknown;
};
export type VideoPublishApprovalDiagnostics = {
  approved: boolean;
  reason: string | null;
  missingChecks: VideoApprovalCheck[];
  approvalStatus: string | null;
};

export function inspectVideoQueueItemApproval(input: {
  contentType: string;
  contentId: string | null;
  queuedVideoUrl: string | null;
  request: VideoPublishRequestSnapshot | null;
}): VideoPublishApprovalDiagnostics {
  if (!isVideoContentType(input.contentType)) {
    return { approved: true, reason: null, missingChecks: [], approvalStatus: "not_required" };
  }
  if (!input.contentId || !input.queuedVideoUrl || !input.request) {
    return { approved: false, reason: "بيانات طلب الفيديو أو ملفه غير مكتملة.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus: null };
  }
  if (input.request.status !== "completed" || !input.request.video_url) {
    return { approved: false, reason: "الفيديو لم يكتمل توليده أو لم يعد ملفه متاحًا.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus: record(input.request.content)?.approvalStatus === "approved" ? "approved" : null };
  }
  if (input.request.video_url.trim() !== input.queuedVideoUrl.trim()) {
    return { approved: false, reason: "ملف الفيديو في الطابور مختلف عن الملف الذي تمت مراجعته؛ يلزم تحديث الطابور وإعادة المراجعة.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus: typeof record(input.request.content)?.approvalStatus === "string" ? String(record(input.request.content)?.approvalStatus) : null };
  }

  const content = record(input.request.content);
  const reviewData = record(content?.qualityReview);
  const missingChecks = REQUIRED_VIDEO_APPROVAL_CHECKS.filter((key) => reviewData?.[key] !== true);
  const approvalStatus = typeof content?.approvalStatus === "string" ? content.approvalStatus : null;
  if (content?.audience === "kids" && (
    !hasCompleteKidsVideoSeriesMetadata(content) ||
    content.kidsVideoQaStatus !== "passed"
  )) {
    return {
      approved: false,
      reason: "فحص أمان فيديو الأطفال أو بيانات السلسلة غير مكتملة؛ تم إيقاف النشر الخارجي.",
      missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS],
      approvalStatus,
    };
  }
  const snapshotHash = buildVideoApprovalSnapshotHash({
    category: input.request.category,
    sourceHash: input.request.source_hash,
    contentHash: input.request.content_hash,
    templateVersion: input.request.template_version,
    videoUrl: input.request.video_url,
    audience: content?.audience === "kids" ? "kids" : "general",
    kidsVideoQaStatus: typeof content?.kidsVideoQaStatus === "string" ? content.kidsVideoQaStatus : null,
  });
  const approved = isVideoApprovalRecorded(content, snapshotHash);
  if (approved) return { approved: true, reason: null, missingChecks: [], approvalStatus };

  let reason: string;
  if (approvalStatus !== "approved") {
    reason = "بانتظار اكتمال فحص الجودة الآلي.";
  } else if (missingChecks.length > 0) {
    reason = "فحوص الجودة الآلية غير مكتملة؛ تم إيقاف النشر الخارجي."
  } else if (!snapshotHash || content?.approvalSnapshotHash !== snapshotHash) {
    reason = "بصمة المصدر أو المحتوى أو القالب أو ملف الفيديو تغيّرت؛ يلزم فحص آلي جديد."
  } else if (typeof content?.approvalReviewerId !== "string" || !content.approvalReviewerId.trim() || typeof content?.approvalReviewedAt !== "string") {
    reason = "سجل فحص الجودة الآلي غير مكتمل؛ تم إيقاف النشر الخارجي."
  } else {
    reason = "لم يجتز الفيديو شروط الاعتماد النهائي للنشر.";
  }
  return { approved: false, reason, missingChecks, approvalStatus };
}

export function isVideoQueueItemApprovedForPublishing(input: {
  contentType: string;
  contentId: string | null;
  queuedVideoUrl: string | null;
  request: VideoPublishRequestSnapshot | null;
}): boolean {
  return inspectVideoQueueItemApproval(input).approved;
}
