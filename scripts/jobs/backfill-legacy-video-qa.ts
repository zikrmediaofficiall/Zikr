import { getServerEnv } from "../../src/lib/env";
import { supabaseServerAdminRequest } from "../../src/lib/supabase/admin-rest";
import {
  assertBackfillApplyConfirmation,
  assertBackfillTargetProject,
  classifyBackfillPatchResult,
} from "../../src/features/videos/services/video-qa-backfill-policy";
import { normalizeVideoAudience, normalizeVideoMarker } from "../../src/features/videos/services/video-audience-visibility";
import { sourceHash, videoContentHash } from "../../src/features/videos/providers/content-hash";
import { AI_VISUAL_POLICY_VERSION } from "../../src/features/videos/providers/ai-visual-policy";
import { MAX_AUTO_VIDEO_SECONDS } from "../../src/features/videos/services/render-duration";
import {
  AUTOMATED_VIDEO_QA_ENGINE,
  AUTOMATED_VIDEO_QA_VERSION,
  REQUIRED_VIDEO_APPROVAL_CHECKS,
  createAutomatedVideoQaApproval,
  hasCompleteKidsVideoSeriesMetadata,
  hasCompleteVideoApprovalChecklist,
} from "../../src/features/videos/services/video-publish-approval";
import {
  assertKidsStoryContract,
  buildAutomatedVideoQaChecklist,
  contentText,
  contentSourceUrl,
  validateSourceContent,
  type GeneratedRequest,
} from "./template-video-automation";

type LegacyVideoRequest = GeneratedRequest & {
  updated_at: string;
  source_hash: string | null;
  content_hash: string | null;
  template_version: string | null;
  scene: string | null;
  render_duration_ms: number | null;
  video_url: string | null;
  provider: string | null;
};

type RecordValue = Record<string, unknown>;

const KIDS_CLASSIFICATION_BLOCK_REASON =
  "The stored source belongs to a Kids series but the request has no explicit Kids audience; it must be classified before approval.";

function isKidsClassificationRevalidation(content: RecordValue) {
  const qa = asRecord(content.automatedVideoQa);
  return normalizeVideoMarker(qa.status) === "blocked" &&
    qa.blockedReason === KIDS_CLASSIFICATION_BLOCK_REASON &&
    normalizeVideoMarker(content.curatedSourceId).startsWith("kids-series:");
}

function isKidsQaRevalidation(content: RecordValue) {
  const qa = asRecord(content.automatedVideoQa);
  return normalizeVideoAudience(content.audience, false) === "kids" &&
    normalizeVideoMarker(content.kidsVideoQaStatus) !== "passed" &&
    normalizeVideoMarker(content.approvalStatus) === "approved" &&
    content.approvalReviewerId === "system:zikr-video-factory" &&
    normalizeVideoMarker(qa.status) === "passed";
}

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

export function validateLegacyCloudinaryMaster(videoUrl: string, content: RecordValue): string | null {
  try {
    const parsed = new URL(videoUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return null;
    const marker = "/video/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    let assetPath = parsed.pathname.slice(markerIndex + marker.length);
    assetPath = assetPath.replace(/^v\d+\//, "");
    if (!/\.(mp4|webm|mov|m4v)$/i.test(assetPath)) return null;
    const publicId = assetPath.replace(/\.(mp4|webm|mov|m4v)$/i, "");
    if (!publicId.startsWith("auto-")) return null;
    const storage = asRecord(content.mediaStorage);
    if (storage.provider !== "cloudinary") return null;
    if (typeof storage.publicId !== "string" || storage.publicId !== publicId) return null;
    const bytes = Number(storage.bytes);
    if (!Number.isFinite(bytes) || bytes < 1024) return null;
    return publicId;
  } catch {
    return null;
  }
}

async function verifyRemoteMedia(videoUrl: string): Promise<boolean> {
  try {
    let response = await fetch(videoUrl, {
      method: "HEAD",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(videoUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      await response.body?.cancel();
    }
    if (!response.ok && response.status !== 206) return false;
    const type = response.headers.get("content-type")?.toLowerCase() ?? "";
    return type.startsWith("video/") || type.includes("application/octet-stream");
  } catch {
    return false;
  }
}

function expectedHashes(request: LegacyVideoRequest) {
  const content = asRecord(request.content);
  const text = contentText(request);
  const contentSourceId = typeof content.sourceId === "string" ? content.sourceId : "";
  // Match the generation worker exactly: missing sourceUrl falls back to the canonical site origin.
  const sourceUrl = contentSourceUrl(request);
  const currentSourceHash = sourceHash({ sourceId: contentSourceId, sourceUrl, text });
  const resolution = typeof content.resolution === "string" ? content.resolution : "";
  const format = resolution
    ? (Number(resolution.split("x")[0]) > Number(resolution.split("x")[1]) ? "horizontal" : "vertical")
    : content.videoFormat === "horizontal" ? "horizontal" : "vertical";
  const version = typeof request.template_version === "string" ? request.template_version : "";
  const currentContentHash = videoContentHash({
    category: request.category,
    sourceId: contentSourceId,
    text,
    format,
    templateVersion: version,
    language: typeof content.language === "string" ? content.language : "ar",
    style: typeof content.style === "string" ? content.style : "",
  });
  return { currentSourceHash, currentContentHash, text, version };
}

async function patchRequest(
  id: string,
  content: RecordValue,
  expectedUpdatedAt: string,
  expectedBlockedReason?: string,
  expectedKidsQaStatus?: string | null,
): Promise<boolean> {
  if (!expectedUpdatedAt.trim()) {
    throw new Error("Legacy Video QA backfill requires the selected row's updated_at value.");
  }
  const qaGuard = expectedBlockedReason
    ? "&content->automatedVideoQa->>blockedReason=eq." + encodeURIComponent(expectedBlockedReason)
    : expectedKidsQaStatus !== undefined
      ? "&content->>audience=eq.kids&content->>kidsVideoQaStatus=" + (expectedKidsQaStatus === null ? "is.null" : "eq." + encodeURIComponent(expectedKidsQaStatus)) + "&content->>approvalStatus=eq.approved&content->>approvalReviewerId=eq.system%3Azikr-video-factory&content->automatedVideoQa->>status=eq.passed"
      : "&content->automatedVideoQa=is.null";
  const updatedRows = await supabaseServerAdminRequest<RecordValue[]>(
    "/rest/v1/video_generation_requests?id=eq." +
      encodeURIComponent(id) +
      "&status=eq.completed&updated_at=eq." +
      encodeURIComponent(expectedUpdatedAt) +
      qaGuard +
      "&select=id,updated_at",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
    },
  );
  const outcome = classifyBackfillPatchResult(updatedRows);
  if (outcome === "unexpected") {
    throw new Error("Legacy Video QA backfill expected exactly one updated row; refusing to report a successful write.");
  }
  return outcome === "updated";
}

async function listLegacyRequests(): Promise<LegacyVideoRequest[]> {
  const select = "select=id,title,description,category,content,status,updated_at,automation_key,video_url,source_hash,content_hash,template_version,scene,render_duration_ms,provider";
  const cutoff = "/rest/v1/video_generation_requests?status=eq.completed&video_url=not.is.null&" + select +
    "&order=created_at.asc&limit=200&";
  const [missingQa, kidsClassificationBlocked, kidsQaMissing, kidsQaBlocked] = await Promise.all([
    supabaseServerAdminRequest<LegacyVideoRequest[]>(
      cutoff + "content->automatedVideoQa=is.null",
    ),
    supabaseServerAdminRequest<LegacyVideoRequest[]>(
      cutoff +
      "content->automatedVideoQa->>status=eq.blocked" +
      "&content->automatedVideoQa->>blockedReason=eq." + encodeURIComponent(KIDS_CLASSIFICATION_BLOCK_REASON) +
      "&content->>curatedSourceId=like.kids-series%3A*",
    ),
    supabaseServerAdminRequest<LegacyVideoRequest[]>(
      cutoff + "content->>audience=eq.kids&content->>kidsVideoQaStatus=is.null" +
      "&content->>approvalStatus=eq.approved&content->>approvalReviewerId=eq.system%3Azikr-video-factory" +
      "&content->automatedVideoQa->>status=eq.passed",
    ),
    supabaseServerAdminRequest<LegacyVideoRequest[]>(
      cutoff + "content->>audience=eq.kids&content->>kidsVideoQaStatus=eq.blocked" +
      "&content->>approvalStatus=eq.approved&content->>approvalReviewerId=eq.system%3Azikr-video-factory" +
      "&content->automatedVideoQa->>status=eq.passed",
    ),
  ]);
  const byId = new Map<string, LegacyVideoRequest>();
  for (const request of [...(missingQa ?? []), ...(kidsClassificationBlocked ?? []), ...(kidsQaMissing ?? []), ...(kidsQaBlocked ?? [])]) {
    byId.set(request.id, request);
  }
  return [...byId.values()];
}

async function processRequest(request: LegacyVideoRequest, apply: boolean) {
  const originalContent = asRecord(request.content);
  const revalidatingKidsClassification = isKidsClassificationRevalidation(originalContent);
  const revalidatingKidsQa = isKidsQaRevalidation(originalContent);
  const existingReviewer = typeof originalContent.approvalReviewerId === "string" ? originalContent.approvalReviewerId.trim() : "";
  const existingQa = asRecord(originalContent.automatedVideoQa);
  if (existingReviewer && existingReviewer !== "system:zikr-video-factory") {
    return { id: request.id, status: "skipped", reason: "Existing human review is preserved; automated backfill will not overwrite it." };
  }
  if (Object.keys(existingQa).length > 0 && !revalidatingKidsClassification && !revalidatingKidsQa) {
    return { id: request.id, status: "skipped", reason: "Existing QA decision is not eligible for automatic revalidation." };
  }
  const checkedAt = new Date().toISOString();
  let sourceRevalidated = false;
  let mediaVerified = false;
  const fail = async (reason: string, checks?: ReturnType<typeof buildAutomatedVideoQaChecklist>) => {
    const reviewChecks = checks ?? Object.fromEntries(
      REQUIRED_VIDEO_APPROVAL_CHECKS.map((key) => [key, false]),
    ) as Record<(typeof REQUIRED_VIDEO_APPROVAL_CHECKS)[number], boolean>;
    const missingChecks = REQUIRED_VIDEO_APPROVAL_CHECKS.filter((key) => reviewChecks[key] !== true);
    const blockedContent: RecordValue = {
      ...originalContent,
      ...(normalizeVideoAudience(originalContent.audience, false) === "kids" || revalidatingKidsClassification || revalidatingKidsQa ? { kidsVideoQaStatus: "blocked" } : {}),
      approvalStatus: "qa_failed",
      approvalReviewerId: null,
      approvalReviewedAt: null,
      approvalSnapshotHash: null,
      qualityReview: {
        ...reviewChecks,
        reviewedAt: checkedAt,
        mode: "automated",
        engine: AUTOMATED_VIDEO_QA_ENGINE,
        engineVersion: AUTOMATED_VIDEO_QA_VERSION,
        blockedReason: reason,
      },
      automatedVideoQa: {
        status: "blocked",
        engine: AUTOMATED_VIDEO_QA_ENGINE,
        engineVersion: AUTOMATED_VIDEO_QA_VERSION,
        reviewedAt: checkedAt,
        checks: reviewChecks,
        missingChecks,
        blockedReason: reason,
        legacyBackfill: {
          checkedAt,
          sourceRevalidated,
          mediaVerified,
          method: "safe_legacy_backfill_v1",
        },
      },
    };
    if (revalidatingKidsClassification) {
      asRecord(blockedContent.automatedVideoQa).legacyBackfill = {
        ...asRecord(asRecord(blockedContent.automatedVideoQa).legacyBackfill),
        previousBlockedReason: KIDS_CLASSIFICATION_BLOCK_REASON,
        revalidatedAfterCanonicalKidsClassification: true,
      };
    }
    if (apply) {
      const updated = await patchRequest(
        request.id,
        blockedContent,
        request.updated_at,
        revalidatingKidsClassification ? KIDS_CLASSIFICATION_BLOCK_REASON : undefined,
        revalidatingKidsQa ? (typeof originalContent.kidsVideoQaStatus === "string" ? originalContent.kidsVideoQaStatus : null) : undefined,
      );
      if (!updated) {
        return { id: request.id, status: "stale", reason: "The request changed after selection; no QA metadata was written." };
      }
    }
    return { id: request.id, status: "blocked", reason, missingChecks };
  };

  if (!request.video_url || !request.source_hash || !request.content_hash || !request.template_version) {
    return fail("Missing persisted video URL or one of the generation fingerprints.");
  }
  if (!/^[a-f0-9]{64}$/i.test(request.source_hash) || !/^[a-f0-9]{64}$/i.test(request.content_hash)) {
    return fail("Persisted source/content hash is not a SHA-256 fingerprint.");
  }
  if (originalContent.sourceHash !== request.source_hash || originalContent.contentHash !== request.content_hash) {
    return fail("Content JSON fingerprints do not match the persisted request fingerprints.");
  }
  if (originalContent.templateVersion !== request.template_version ||
      asRecord(originalContent.render).templateVersion !== request.template_version) {
    return fail("Template version in content/render does not match the persisted request version.");
  }
  if (originalContent.templateVersionId) {
    return fail("The historical request references a mutable template version; it requires a dedicated template-version audit.");
  }
  const publicId = validateLegacyCloudinaryMaster(request.video_url, originalContent);
  if (!publicId) return fail("The stored media URL is not a matching Cloudinary video master with a verified media record.");

  const requestForValidation = {
    ...request,
    content: { ...originalContent },
  } as LegacyVideoRequest & GeneratedRequest;
  try {
    if (["quran", "hadith", "dua", "adhkar", "story"].includes(request.category)) {
      await validateSourceContent(requestForValidation);
    }
    if (normalizeVideoAudience(asRecord(requestForValidation.content).audience, false) === "kids") {
      assertKidsStoryContract(requestForValidation);
    }
    sourceRevalidated = true;
  } catch (error) {
    return fail("Source or Kids content revalidation failed: " + (error instanceof Error ? error.message : String(error)));
  }

  const validatedContent = asRecord(requestForValidation.content);
  if (normalizeVideoMarker(originalContent.curatedSourceId).startsWith("kids-series:") &&
      normalizeVideoAudience(validatedContent.audience, false) !== "kids") {
    return fail("Canonical Kids source lookup did not restore the explicit Kids audience metadata.");
  }
  if (typeof request.provider === "string" && request.provider.trim()) {
    validatedContent.aiProvider = request.provider.trim();
    requestForValidation.content = validatedContent;
  }
  const hashes = expectedHashes({ ...request, content: validatedContent });
  if (hashes.currentSourceHash !== request.source_hash) {
    return fail("Revalidated current source text/URL no longer matches the original source hash.");
  }
  if (hashes.currentContentHash !== request.content_hash) {
    return fail("Recomputed current content fingerprint does not match the rendered content hash.");
  }

  mediaVerified = await verifyRemoteMedia(request.video_url);
  if (!mediaVerified) return fail("Cloudinary did not confirm that the stored master is reachable as a video asset.");

  const persistedRender = asRecord(validatedContent.render);
  const persistedDurationSeconds = Number(persistedRender.durationSeconds);
  if (
    !Number.isFinite(persistedDurationSeconds) ||
    persistedDurationSeconds < 1 ||
    persistedDurationSeconds > MAX_AUTO_VIDEO_SECONDS
  ) {
    return fail("The legacy request has no valid measured render duration; it cannot be approved by automated backfill.");
  }

  const checks = buildAutomatedVideoQaChecklist(
    requestForValidation,
    {
      videoUrl: request.video_url,
      scene: request.scene ?? "",
      durationSeconds: persistedDurationSeconds,
      renderDurationMs: request.render_duration_ms ?? 0,
      sourceHash: request.source_hash,
      contentHash: request.content_hash,
      templateVersion: request.template_version,
    },
  );
  const normalizedAudience = normalizeVideoAudience(validatedContent.audience);
  if (!normalizedAudience) return fail("Unknown audience marker after source revalidation.");
  const isKidsVideo = normalizedAudience === "kids";
  const kidsVideoQaStatus = isKidsVideo
    ? hasCompleteKidsVideoSeriesMetadata(validatedContent) && hasCompleteVideoApprovalChecklist(checks)
      ? "passed"
      : "blocked"
    : null;
  const approval = createAutomatedVideoQaApproval({
    snapshot: {
      category: request.category,
      sourceHash: request.source_hash,
      contentHash: request.content_hash,
      templateVersion: request.template_version,
      videoUrl: request.video_url,
      audience: normalizedAudience,
      ...(isKidsVideo ? { kidsVideoQaStatus } : {}),
    },
    checks,
    reviewedAt: checkedAt,
  });
  if (!approval) {
    return fail("One or more current automated QA checks did not pass.", checks);
  }

  const approvedContent: RecordValue = {
    ...validatedContent,
    ...approval,
    automatedVideoQa: {
      ...asRecord(approval.automatedVideoQa),
      legacyBackfill: {
        checkedAt,
        sourceRevalidated: true,
        mediaVerified: true,
        mediaPublicId: publicId,
        sourceHashVerified: true,
        contentHashVerified: true,
        currentVisualPolicyVersion: AI_VISUAL_POLICY_VERSION,
        method: "safe_legacy_backfill_v1",
        ...(revalidatingKidsQa ? { revalidatedKidsSpecificQa: true } : {}),
      },
    },
  };
  if (revalidatingKidsClassification) {
    approvedContent.automatedVideoQa = {
      ...asRecord(approvedContent.automatedVideoQa),
      legacyBackfill: {
        ...asRecord(asRecord(approvedContent.automatedVideoQa).legacyBackfill),
        previousBlockedReason: KIDS_CLASSIFICATION_BLOCK_REASON,
        revalidatedAfterCanonicalKidsClassification: true,
      },
    };
  }
  if (apply) {
    const updated = await patchRequest(
      request.id,
      approvedContent,
      request.updated_at,
      revalidatingKidsClassification ? KIDS_CLASSIFICATION_BLOCK_REASON : undefined,
      revalidatingKidsQa ? (typeof originalContent.kidsVideoQaStatus === "string" ? originalContent.kidsVideoQaStatus : null) : undefined,
    );
    if (!updated) {
      return { id: request.id, status: "stale", reason: "The request changed after selection; no QA metadata was written." };
    }
  }
  return {
    id: request.id,
    status: "passed",
    checks,
    sourceRevalidated: true,
    mediaVerified: true,
  };
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Legacy Video QA backfill requires the production Supabase service-role environment.");
  }
  const apply = process.argv.includes("--apply");
  assertBackfillTargetProject(SUPABASE_URL, process.env.EXPECTED_PROJECT_REF);
  assertBackfillApplyConfirmation(
    apply,
    process.env.BACKFILL_APPLY,
    process.env.BACKFILL_CONFIRMATION,
  );
  const rows = await listLegacyRequests();
  console.log("[video-qa-backfill] mode=" + (apply ? "apply" : "dry-run") + " candidates=" + rows.length);
  const results = [];
  for (const request of rows) {
    const result = await processRequest(request, apply);
    results.push(result);
    console.log("[video-qa-backfill] " + JSON.stringify(result));
  }
  const passed = results.filter((item) => item.status === "passed").length;
  const blocked = results.filter((item) => item.status === "blocked").length;
  const stale = results.filter((item) => item.status === "stale").length;
  console.log("[video-qa-backfill] complete passed=" + passed + " blocked=" + blocked + " stale=" + stale + " applied=" + apply);
}

main().catch((error) => {
  console.error("[video-qa-backfill] failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
