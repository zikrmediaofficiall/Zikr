import { createHash } from "node:crypto";
import { isKidsVideoContentMarker, normalizeVideoAudience, normalizeVideoMarker } from "./video-audience-visibility";
import { inspectVideoAssetUse } from "./video-asset-registry";

export const REQUIRED_VIDEO_APPROVAL_CHECKS = ["sourceVerified", "audioReviewed", "visualsReviewed", "captionsReviewed", "rightsReviewed"] as const;
export type VideoApprovalCheck = (typeof REQUIRED_VIDEO_APPROVAL_CHECKS)[number];
export type VideoApprovalChecklist = Record<VideoApprovalCheck, boolean>;

export const AUTOMATED_VIDEO_QA_ENGINE = "zikr_video_factory";
export const AUTOMATED_VIDEO_QA_VERSION = "2026-11-07-auto-qa-v1";
export const AUTOMATED_VIDEO_QA_REVIEWER_ID = "system:zikr-video-factory";

export type AutomatedVideoQaRecord = {
  status: "passed";
  engine: typeof AUTOMATED_VIDEO_QA_ENGINE;
  engineVersion: typeof AUTOMATED_VIDEO_QA_VERSION;
  reviewedAt: string;
  snapshotHash: string;
  checks: VideoApprovalChecklist;
  missingChecks: [];
};

export type AutomatedVideoQaApproval = {
  approvalStatus: "approved";
  approvalReviewerId: typeof AUTOMATED_VIDEO_QA_REVIEWER_ID;
  approvalReviewedAt: string;
  approvalSnapshotHash: string;
  qualityReview: VideoApprovalChecklist & {
    reviewedAt: string;
    mode: "automated";
    reviewerId: typeof AUTOMATED_VIDEO_QA_REVIEWER_ID;
    engine: typeof AUTOMATED_VIDEO_QA_ENGINE;
    engineVersion: typeof AUTOMATED_VIDEO_QA_VERSION;
    snapshotHash: string;
  };
  kidsVideoQaStatus?: "passed";
  automatedVideoQa: AutomatedVideoQaRecord;
};
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function isVideoContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  return normalized === "video" || normalized.endsWith("_video") || normalized === "video_generation";
}
export function hasCompleteKidsVideoSeriesMetadata(value: unknown): boolean {
  const content = record(value);
  if (!content || normalizeVideoAudience(content.audience, false) !== "kids") return false;
  const completeSeriesIdentity =
    typeof content.seriesId === "string" && Boolean(content.seriesId.trim()) &&
    typeof content.seriesTitle === "string" && Boolean(content.seriesTitle.trim()) &&
    typeof content.learningObjective === "string" && Boolean(content.learningObjective.trim()) &&
    Number.isInteger(Number(content.seasonNumber)) && Number(content.seasonNumber) > 0 &&
    Number.isInteger(Number(content.episodeNumber)) && Number(content.episodeNumber) > 0;
  if (!completeSeriesIdentity || normalizeVideoMarker(content.contentFormat) !== "series_episode") return false;

  const originalFiction =
    normalizeVideoMarker(content.aiMode) === "original_kids_story" &&
    normalizeVideoMarker(content.sourceType) === "original_kids_fiction";
  const reviewedProphetStory = (() => {
    const review = record(content.prophetSourceReview);
    const references = Array.isArray(review?.sourceReferencesVerified)
      ? review.sourceReferencesVerified.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : [];
    return normalizeVideoMarker(content.workflow) === "prophet-story" &&
      normalizeVideoMarker(content.aiMode) === "source_locked" &&
      normalizeVideoMarker(content.sourceType) === "prophet_story" &&
      review?.status === "approved" &&
      typeof review.reviewerId === "string" && Boolean(review.reviewerId.trim()) &&
      !review.reviewerId.startsWith("system:") &&
      typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt)) &&
      review.unsupportedDetailsRemoved === true &&
      review.scriptReviewed === true &&
      review.childSafetyReviewed === true &&
      review.symbolicClayVisualsReviewed === true &&
      references.length > 0 &&
      Array.isArray(content.prophetVisualRules) && content.prophetVisualRules.length >= 3;
  })();

  return originalFiction || reviewedProphetStory;
}

const KIDS_SERIES_METADATA_FIELDS = [
  "contentFormat",
  "aiMode",
  "sourceType",
  "seriesId",
  "seriesTitle",
  "learningObjective",
  "seasonNumber",
  "episodeNumber",
] as const;

function buildKidsSeriesMetadataPatch(requestContent: Record<string, unknown>, metadata: Record<string, unknown>): Record<string, unknown> | null {
  if (!hasCompleteKidsVideoSeriesMetadata(requestContent)) return null;
  const patch: Record<string, unknown> = {};
  for (const field of KIDS_SERIES_METADATA_FIELDS) {
    const requested = requestContent[field];
    const existing = metadata[field];
    if (existing !== undefined && existing !== null && existing !== "") {
      const matches = field === "seasonNumber" || field === "episodeNumber"
        ? Number(existing) === Number(requested)
        : String(existing).trim() === String(requested).trim();
      if (!matches) return null;
    }
    patch[field] = requested;
  }
  return patch;
}

/**
 * Legacy Kids requests stored the QA result on the catalog row, while the
 * request JSON omitted kidsVideoQaStatus. Derive only from a catalog row
 * bound to the same request, URL, hashes, template and automated-QA snapshot.
 */
export function resolveKidsVideoQaStatusForApproval(input: {
  requestContent: unknown;
  catalogMetadata: unknown;
  requestId: string;
  videoUrl: string;
  sourceHash: string | null;
  contentHash: string | null;
  templateVersion: string | null;
}): "passed" | null {
  const requestContent = record(input.requestContent);
  const metadata = record(input.catalogMetadata);
  const requestQa = record(requestContent?.automatedVideoQa);
  const metadataQa = record(metadata?.automatedVideoQa);
  if (!requestContent || !metadata || normalizeVideoAudience(requestContent.audience, false) !== "kids") return null;
  if (requestContent.kidsVideoQaStatus != null && normalizeVideoMarker(requestContent.kidsVideoQaStatus) !== "passed") return null;
  if (
    normalizeVideoMarker(metadata.kidsVideoQaStatus) !== "passed" ||
    metadata.generator !== "zikr_internal_video_factory" ||
    metadata.videoGenerationRequestId !== input.requestId ||
    metadata.generatedVideoUrl !== input.videoUrl ||
    metadata.sourceHash !== input.sourceHash ||
    metadata.contentHash !== input.contentHash ||
    metadata.templateVersion !== input.templateVersion ||
    requestContent.sourceHash !== input.sourceHash ||
    requestContent.contentHash !== input.contentHash ||
    requestContent.templateVersion !== input.templateVersion ||
    normalizeVideoAudience(metadata.audience, false) !== "kids" ||
    requestQa?.status !== "passed" ||
    metadataQa?.status !== "passed" ||
    typeof requestQa.snapshotHash !== "string" ||
    !requestQa.snapshotHash ||
    metadataQa.snapshotHash !== requestQa.snapshotHash ||
    metadata.mediaState === "purged" ||
    metadata.mediaState === "unlinked" ||
    metadata.sourceMediaMissing === true
  ) return null;
  return "passed";
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
  technicalQaDigest?: string | null;
};

export function buildVideoApprovalSnapshotHash(snapshot: VideoApprovalSnapshot): string | null {
  const sourceHash = snapshot.sourceHash?.trim();
  const contentHash = snapshot.contentHash?.trim();
  const videoUrl = snapshot.videoUrl?.trim();
  const category = snapshot.category.trim();
  if (!sourceHash || !contentHash || !videoUrl || !category) return null;
  const audience = normalizeVideoAudience(snapshot.audience);
  if (!audience) return null;
  if (audience === "kids" && normalizeVideoMarker(snapshot.kidsVideoQaStatus) !== "passed") return null;
  const canonical = JSON.stringify([
    category,
    sourceHash,
    contentHash,
    snapshot.templateVersion?.trim() ?? "",
    videoUrl,
    ...(snapshot.technicalQaDigest?.trim() ? ["technical-qa", snapshot.technicalQaDigest.trim()] : []),
    ...(audience === "kids" ? ["kids", "passed"] : []),
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function createAutomatedVideoQaApproval(input: {
  snapshot: VideoApprovalSnapshot;
  checks: VideoApprovalChecklist;
  reviewedAt?: string;
}): AutomatedVideoQaApproval | null {
  const snapshotHash = buildVideoApprovalSnapshotHash(input.snapshot);
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (
    !snapshotHash ||
    !hasCompleteVideoApprovalChecklist(input.checks) ||
    !Number.isFinite(Date.parse(reviewedAt))
  ) return null;

  const qualityReview: AutomatedVideoQaApproval["qualityReview"] = {
    ...input.checks,
    reviewedAt,
    mode: "automated",
    reviewerId: AUTOMATED_VIDEO_QA_REVIEWER_ID,
    engine: AUTOMATED_VIDEO_QA_ENGINE,
    engineVersion: AUTOMATED_VIDEO_QA_VERSION,
    snapshotHash,
  };
  const automatedVideoQa: AutomatedVideoQaRecord = {
    status: "passed",
    engine: AUTOMATED_VIDEO_QA_ENGINE,
    engineVersion: AUTOMATED_VIDEO_QA_VERSION,
    reviewedAt,
    snapshotHash,
    checks: input.checks,
    missingChecks: [],
  };
  return {
    approvalStatus: "approved",
    approvalReviewerId: AUTOMATED_VIDEO_QA_REVIEWER_ID,
    approvalReviewedAt: reviewedAt,
    approvalSnapshotHash: snapshotHash,
    qualityReview,
    ...(normalizeVideoAudience(input.snapshot.audience) === "kids" ? { kidsVideoQaStatus: "passed" as const } : {}),
    automatedVideoQa,
  };
}

export function buildVideoCatalogApprovalPatch(input: {
  metadata: unknown;
  requestContent: unknown;
  requestId: string;
  videoUrl: string;
  sourceHash: string | null;
  contentHash: string | null;
  templateVersion: string | null;
  snapshotHash: string;
  reviewerId: string;
  reviewedAt: string;
  checks: VideoApprovalChecklist;
}): { metadata: Record<string, unknown>; updated_at: string } | null {
  const metadata = record(input.metadata);
  const requestContent = record(input.requestContent);
  const requestId = input.requestId.trim();
  const videoUrl = input.videoUrl.trim();
  const sourceHash = input.sourceHash?.trim() ?? "";
  const contentHash = input.contentHash?.trim() ?? "";
  const templateVersion = input.templateVersion?.trim() ?? "";
  const snapshotHash = input.snapshotHash.trim();
  const reviewerId = input.reviewerId.trim();
  const requestQa = record(requestContent?.automatedVideoQa);
  const metadataQa = record(metadata?.automatedVideoQa);
  const audience = normalizeVideoAudience(requestContent?.audience, false);
  if (audience && isKidsVideoContentMarker(requestContent) && audience !== "kids") return null;

  if (
    !metadata ||
    !requestContent ||
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
    requestContent.approvalStatus !== "approved" ||
    requestContent.approvalSnapshotHash !== snapshotHash ||
    !isVideoApprovalRecorded(requestContent, snapshotHash) ||
    requestQa?.status !== "passed" ||
     requestQa.snapshotHash !== snapshotHash ||
    !audience ||
    (metadata.audience != null && normalizeVideoAudience(metadata.audience, false) !== audience) ||
    (metadata.approvalStatus != null && metadata.approvalStatus !== "approved") ||
    (metadata.approvalSnapshotHash != null && metadata.approvalSnapshotHash !== snapshotHash) ||
    metadataQa?.status !== "passed" ||
     metadataQa.snapshotHash !== snapshotHash ||
    metadata.mediaState === "purged" ||
    metadata.mediaState === "unlinked" ||
    metadata.sourceMediaMissing === true
  ) return null;

  const kidsSeriesMetadataPatch = audience === "kids"
    ? buildKidsSeriesMetadataPatch(requestContent, metadata)
    : null;
  if (audience === "kids" && (
    normalizeVideoMarker(requestContent.kidsVideoQaStatus) !== "passed" ||
    normalizeVideoMarker(metadata.kidsVideoQaStatus) !== "passed" ||
    !kidsSeriesMetadataPatch
  )) return null;

  const qualityReview = {
    ...input.checks,
    reviewedAt: input.reviewedAt,
    mode: "human",
    reviewerId,
  };
  return {
    metadata: {
      ...metadata,
      ...(kidsSeriesMetadataPatch ?? {}),
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

export function isAutomatedKidsVideoApprovalRecorded(content: unknown, expectedSnapshotHash: string | null): boolean {
  const data = record(content);
  const review = record(data?.qualityReview);
  const automated = record(data?.automatedVideoQa);
  return normalizeVideoAudience(data?.audience, false) === "kids" &&
    normalizeVideoMarker(data?.kidsVideoQaStatus) === "passed" &&
    data?.approvalReviewerId === AUTOMATED_VIDEO_QA_REVIEWER_ID &&
    isVideoApprovalRecorded(data, expectedSnapshotHash) &&
    review?.mode === "automated" &&
    review.reviewerId === AUTOMATED_VIDEO_QA_REVIEWER_ID &&
    review.reviewedAt === data?.approvalReviewedAt &&
    automated?.reviewedAt === data?.approvalReviewedAt &&
    review.engine === AUTOMATED_VIDEO_QA_ENGINE &&
    review.engineVersion === AUTOMATED_VIDEO_QA_VERSION &&
    review.snapshotHash === expectedSnapshotHash &&
    automated?.status === "passed" &&
    automated.engine === AUTOMATED_VIDEO_QA_ENGINE &&
    automated.engineVersion === AUTOMATED_VIDEO_QA_VERSION &&
    automated.snapshotHash === expectedSnapshotHash &&
    hasCompleteVideoApprovalChecklist(automated.checks);
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
export function buildVideoApprovalSnapshotHashForRequest(request: VideoPublishRequestSnapshot | null): string | null {
  if (!request || request.status !== "completed" || !request.video_url) return null;
  const content = record(request.content);
  const audience = normalizeVideoAudience(content?.audience);
  if (!audience || (content && isKidsVideoContentMarker(content) && audience !== "kids")) return null;
  return buildVideoApprovalSnapshotHash({
    category: request.category,
    sourceHash: request.source_hash,
    contentHash: request.content_hash,
    templateVersion: request.template_version,
    videoUrl: request.video_url,
    audience,
    kidsVideoQaStatus: typeof content?.kidsVideoQaStatus === "string" ? content.kidsVideoQaStatus : null,
    technicalQaDigest: typeof record(content?.videoTechnicalQa)?.digest === "string"
      ? String(record(content?.videoTechnicalQa)?.digest)
      : null,
  });
}

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
  if (!content) {
    return { approved: false, reason: "بيانات طلب الفيديو غير مكتملة.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus: null };
  }
  const reviewData = record(content.qualityReview);
  const missingChecks = REQUIRED_VIDEO_APPROVAL_CHECKS.filter((key) => reviewData?.[key] !== true);
  const approvalStatus = typeof content.approvalStatus === "string" ? content.approvalStatus : null;
  const audience = normalizeVideoAudience(content.audience);
  if (!audience) {
    return { approved: false, reason: "فئة الجمهور غير معروفة؛ تم إيقاف النشر لحين مراجعة البيانات.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus };
  }
  if (isKidsVideoContentMarker(content) && audience !== "kids") {
    return {
      approved: false,
      reason: "علامات محتوى الأطفال لا تتوافق مع فئة الجمهور المسجلة؛ تم إيقاف النشر الخارجي.",
      missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS],
      approvalStatus,
    };
  }

  if (audience === "kids" && (
    !hasCompleteKidsVideoSeriesMetadata(content) ||
    normalizeVideoMarker(content.kidsVideoQaStatus) !== "passed"
  )) {
    return {
      approved: false,
      reason: "فحص أمان فيديو الأطفال أو بيانات السلسلة غير مكتملة؛ تم إيقاف النشر الخارجي.",
      missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS],
      approvalStatus,
    };
  }
  const snapshotHash = buildVideoApprovalSnapshotHashForRequest(input.request);
  if (!snapshotHash) {
    return { approved: false, reason: "بصمة المصدر أو المحتوى أو ملف الفيديو غير مكتملة.", missingChecks: [...REQUIRED_VIDEO_APPROVAL_CHECKS], approvalStatus };
  }
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

export function inspectVideoQueueItemExternalApproval(input: {
  contentType: string;
  contentId: string | null;
  queuedVideoUrl: string | null;
  request: VideoPublishRequestSnapshot | null;
}): VideoPublishApprovalDiagnostics {
  const diagnostics = inspectVideoQueueItemApproval(input);
  if (!diagnostics.approved) return diagnostics;

  const content = record(input.request?.content);
  if (!input.request || !content) return diagnostics;

  const render = record(content.render);
  const hasStoryboardField = Boolean(render && Object.prototype.hasOwnProperty.call(render, "storyboard"));
  const storyboardValue = render?.storyboard;
  const storyboard = record(storyboardValue);
  const referencedAssetKeys = new Set<string>();
  let hasInvalidVisualReference = false;
  const isStudioBinding = content.templateBindingMode === "studio";
  const requiresAssetRightsCheck =
    isStudioBinding ||
    typeof content.templateAssetKey === "string" ||
    hasStoryboardField ||
    Object.prototype.hasOwnProperty.call(content, "visualAssetKeys");

  if (isStudioBinding) {
    const configSnapshot = record(content.templateConfigSnapshot);
    if (
      typeof content.templateId !== "string" || !content.templateId.trim() ||
      typeof content.templateSlug !== "string" || !content.templateSlug.trim() ||
      typeof content.templateVersionId !== "string" || !content.templateVersionId.trim() ||
      !configSnapshot ||
      typeof configSnapshot.assetKey !== "string" ||
      configSnapshot.assetKey !== content.templateAssetKey
    ) {
      hasInvalidVisualReference = true;
    }
  }

  if (requiresAssetRightsCheck && typeof content.audience !== "string") {
    hasInvalidVisualReference = true;
  }
  if (requiresAssetRightsCheck && typeof content.templateAssetKey === "string") {
    if (content.templateAssetKey.trim()) referencedAssetKeys.add(content.templateAssetKey.trim());
    else hasInvalidVisualReference = true;
  } else if (isStudioBinding) {
    hasInvalidVisualReference = true;
  }

  if (Object.prototype.hasOwnProperty.call(content, "visualAssetKeys")) {
    if (!Array.isArray(content.visualAssetKeys) || content.visualAssetKeys.length === 0) {
      hasInvalidVisualReference = true;
    } else {
      for (const value of content.visualAssetKeys) {
        if (typeof value === "string" && value.trim()) referencedAssetKeys.add(value.trim());
        else hasInvalidVisualReference = true;
      }
    }
  }

  if (hasStoryboardField) {
    if (
      !storyboard ||
      storyboard.version !== "zikr-storyboard-v1" ||
      !Array.isArray(storyboard.scenes) ||
      storyboard.scenes.length < 2 ||
      storyboard.scenes.length > 6
    ) {
      hasInvalidVisualReference = true;
    } else {
      for (const value of storyboard.scenes) {
        const scene = record(value);
        if (
          !scene ||
          typeof scene.assetKey !== "string" ||
          !scene.assetKey.trim() ||
          !Number.isInteger(scene.index) ||
          typeof scene.id !== "string" ||
          !scene.id.trim() ||
          typeof scene.startSeconds !== "number" ||
          !Number.isFinite(scene.startSeconds) ||
          scene.startSeconds < 0 ||
          typeof scene.durationSeconds !== "number" ||
          !Number.isFinite(scene.durationSeconds) ||
          scene.durationSeconds <= 0
        ) {
          hasInvalidVisualReference = true;
        } else {
          referencedAssetKeys.add(scene.assetKey.trim());
        }
      }
    }
  }

  if (requiresAssetRightsCheck) {
    const audience = normalizeVideoAudience(content.audience);
    if (!audience || hasInvalidVisualReference || referencedAssetKeys.size === 0) {
      return {
        ...diagnostics,
        approved: false,
        reason: "بيانات النسخة المثبتة أو قائمة الأصول البصرية غير مكتملة؛ تم إيقاف النشر الخارجي لحين استكمالها وإثبات الحقوق الموثقة.",
        missingChecks: ["rightsReviewed"],
      };
    }
    for (const assetKey of referencedAssetKeys) {
      const publicSiteDecision = inspectVideoAssetUse({
        assetKey,
        audience,
        destination: "public_site",
        topic: input.request.category,
      });
      const socialDecision = inspectVideoAssetUse({
        assetKey,
        audience,
        destination: "social",
        topic: input.request.category,
      });
      if (!publicSiteDecision.allowed || !socialDecision.allowed) {
        return {
          ...diagnostics,
          approved: false,
          reason: "الأصل البصري " + assetKey + " لم يحصل على مراجعة حقوق موثقة؛ المعاينة الداخلية مسموحة لكن النشر العام والاجتماعي متوقف.",
          missingChecks: ["rightsReviewed"],
        };
      }
    }
  }

  if (normalizeVideoAudience(content.audience) !== "kids") return diagnostics;

  const snapshotHash = buildVideoApprovalSnapshotHashForRequest(input.request);
  if (!snapshotHash) return {
    ...diagnostics,
    approved: false,
    reason: "بصمة مراجعة فيديو الأطفال غير مكتملة؛ تم إيقاف النشر الخارجي.",
    missingChecks: [],
  };
  if (isAutomatedKidsVideoApprovalRecorded(content, snapshotHash)) return diagnostics;

  return {
    ...diagnostics,
    approved: false,
    reason: "فيديو الأطفال لم يجتز اعتماد الجودة الآلي الكامل أو لا تطابق بصمته ملف الفيديو الحالي.",
    missingChecks: [],
  };
}

export function isVideoQueueItemApprovedForPublishing(input: {
  contentType: string;
  contentId: string | null;
  queuedVideoUrl: string | null;
  request: VideoPublishRequestSnapshot | null;
}): boolean {
  return inspectVideoQueueItemExternalApproval(input).approved;
}
