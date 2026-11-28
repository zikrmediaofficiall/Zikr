"use client";

import { isKidsVideoContentMarker, normalizeVideoMarker, resolveVideoRequestAudience } from "@/features/videos/services/video-audience-visibility";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PurgeGeneratedVideosControl } from "@/features/admin/components/purge-generated-videos-control";
import { redirectToAdminStepUp } from "@/features/admin/utils/step-up-client";
import type { VideoGenerationRequest } from "@/features/videos/services/video-automation";
import { prepareGeneratedVideoContentForDeletion } from "@/features/videos/services/video-request-deletion";

type Status = "pending" | "processing" | "retry_wait" | "completed" | "failed" | "cancelled";
type QueueFilter = "all" | "review" | Status;
type ApprovalCheckKey = "sourceVerified" | "audioReviewed" | "visualsReviewed" | "captionsReviewed" | "rightsReviewed";

function readVideoTechnicalQa(content: unknown) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const root = content as Record<string, unknown>;
  const snapshot = root.videoTechnicalQa;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const value = snapshot as Record<string, unknown>;
  const media = value.media && typeof value.media === "object" && !Array.isArray(value.media)
    ? value.media as Record<string, unknown>
    : null;
  const report = value.report && typeof value.report === "object" && !Array.isArray(value.report)
    ? value.report as Record<string, unknown>
    : null;
  if (!media || !report) return null;
  const finite = (field: unknown) => typeof field === "number" && Number.isFinite(field) ? field : null;
  const label = (field: unknown) => typeof field === "string" ? field : "—";
  const reasons = Array.isArray(report.reasons)
    ? report.reasons.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];
  return {
    status: root.videoTechnicalQaStatus === "passed" ? "passed" : "unconfirmed",
    engine: label(value.engine),
    version: label(value.version),
    digest: label(value.digest),
    createdAt: label(value.createdAt),
    videoCodec: label(media.videoCodec),
    audioCodec: label(media.audioCodec),
    container: label(media.containerFormat),
    width: finite(media.width),
    height: finite(media.height),
    frameRate: finite(media.frameRate),
    duration: finite(media.durationSeconds),
    sizeBytes: finite(media.sizeBytes),
    audioMeanDb: finite(media.audioMeanVolumeDb),
    audioPeakDb: finite(media.audioPeakVolumeDb),
    frameCount: finite(report.frameCount),
    meanDifference: finite(report.meanAdjacentDifference),
    nearDuplicates: finite(report.nearDuplicateFrames),
    blackFrames: finite(report.blackFrames),
    blankFrames: finite(report.blankFrames),
    passed: report.passed === true,
    reasons,
  };
}

function formatBytes(value: number | null): string {
  if (value === null) return "—";
  return value >= 1024 * 1024 ? (value / 1024 / 1024).toFixed(1) + " MiB" : Math.round(value / 1024) + " KiB";
}

function VideoTechnicalQaPanel({ content }: { content: unknown }) {
  const qa = readVideoTechnicalQa(content);
  if (!qa) {
    return (
      <section className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4">
        <h3 className="font-semibold text-amber-100">فحص P08</h3>
        <p className="mt-2 text-sm leading-6 text-brand-cream/60">لا يوجد تقرير P08 لهذا الطلب؛ قد يكون رندرًا قديمًا سبق دمج بوابة الفحص الفني.</p>
      </section>
    );
  }
  const approved = qa.status === "passed" && qa.passed;
  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-brand-gold/15 bg-black/20 p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-brand-gold">تقرير P08 الفني وتنوّع الإطارات</h3>
          <p className="mt-1 text-[11px] text-brand-cream/35">{qa.engine} · {qa.version}</p>
        </div>
        <span className={approved
          ? "rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
          : "rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-xs text-red-200"}>
          {approved ? "اجتاز الفحص الآلي" : "الفحص غير مكتمل أو مرفوض"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ["الترميز", qa.videoCodec + " / " + qa.audioCodec],
          ["الحاوية", qa.container],
          ["الدقة", qa.width !== null && qa.height !== null ? qa.width + "×" + qa.height : "—"],
          ["الإطارات/ث", qa.frameRate !== null ? qa.frameRate.toFixed(2) : "—"],
          ["المدة", qa.duration !== null ? qa.duration.toFixed(1) + " ثانية" : "—"],
          ["الحجم", formatBytes(qa.sizeBytes)],
          ["متوسط الصوت", qa.audioMeanDb !== null ? qa.audioMeanDb.toFixed(1) + " dB" : "—"],
          ["قمة الصوت", qa.audioPeakDb !== null ? qa.audioPeakDb.toFixed(1) + " dBFS" : "—"],
          ["العينات", qa.frameCount ?? "—"],
          ["تشابه متتالٍ", qa.nearDuplicates ?? "—"],
          ["إطارات سوداء", qa.blackFrames ?? "—"],
          ["إطارات فارغة", qa.blankFrames ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-brand-cream/10 bg-black/25 p-3">
            <p className="text-brand-cream/35">{label}</p>
            <p className="mt-1 font-semibold text-brand-cream/85" dir="ltr">{value}</p>
          </div>
        ))}
      </div>
      {qa.reasons.length > 0 && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3">
          <p className="text-xs font-semibold text-red-200">أسباب الرفض</p>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-5 text-red-100/75">
            {qa.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
          </ul>
        </div>
      )}
      <p className="break-all text-[10px] text-brand-cream/25" dir="ltr">SHA-256: {qa.digest}</p>
    </section>
  );
}
const APPROVAL_CHECKS: ReadonlyArray<{ key: ApprovalCheckKey; label: string }> = [
  { key: "sourceVerified", label: "راجعت المصدر الأصلي وتطابق النص معه." },
  { key: "audioReviewed", label: "استمعت إلى الصوت وتأكدت من وضوحه ومناسبته." },
  { key: "visualsReviewed", label: "راجعت المشاهد والتزمت بالهوية وسياسة المحتوى." },
  { key: "captionsReviewed", label: "راجعت الترجمة والعناوين وعدم وجود أخطاء ظاهرة." },
  { key: "rightsReviewed", label: "تحققت من حقوق استخدام الصوت والصور والعناصر." },
];
function isContentApproved(content: unknown): boolean {
  if (!content || typeof content !== "object" || Array.isArray(content)) return false;
  const record = content as Record<string, unknown>;
  const audience = resolveVideoRequestAudience(record);
  if (!audience.ok) return false;
  return audience.audience === "kids"
    ? isReadyForAutomatedKidsApproval(record)
    : record.approvalStatus === "approved";
}

function isGeneralAudienceVideoRequest(content: unknown): boolean {
  const audience = resolveVideoRequestAudience(content);
  return audience.ok && audience.audience === "general";
}

function isReadyForAutomatedKidsApproval(content: unknown): boolean {
  if (!content || typeof content !== "object" || Array.isArray(content)) return false;
  const record = content as Record<string, unknown>;
  const audience = resolveVideoRequestAudience(record);
  const qa = record.automatedVideoQa && typeof record.automatedVideoQa === "object" && !Array.isArray(record.automatedVideoQa)
    ? record.automatedVideoQa as Record<string, unknown> : null;
  const review = record.qualityReview && typeof record.qualityReview === "object" && !Array.isArray(record.qualityReview)
    ? record.qualityReview as Record<string, unknown> : null;
  const qaChecks = qa?.checks && typeof qa.checks === "object" && !Array.isArray(qa.checks)
    ? qa.checks as Record<string, unknown> : null;
  const reviewAt = typeof record.approvalReviewedAt === "string" ? record.approvalReviewedAt : "";
  const snapshotHash = typeof record.approvalSnapshotHash === "string" ? record.approvalSnapshotHash : "";
  const requiredChecks: ApprovalCheckKey[] = ["sourceVerified", "audioReviewed", "visualsReviewed", "captionsReviewed", "rightsReviewed"];
  const hasCompleteSeries =
    normalizeVideoMarker(record.contentFormat) === "series_episode" &&
    normalizeVideoMarker(record.aiMode) === "original_kids_story" &&
    normalizeVideoMarker(record.sourceType) === "original_kids_fiction" &&
    typeof record.seriesId === "string" && Boolean(record.seriesId.trim()) &&
    typeof record.seriesTitle === "string" && Boolean(record.seriesTitle.trim()) &&
    typeof record.learningObjective === "string" && Boolean(record.learningObjective.trim()) &&
    Number.isInteger(Number(record.seasonNumber)) && Number(record.seasonNumber) > 0 &&
    Number.isInteger(Number(record.episodeNumber)) && Number(record.episodeNumber) > 0;
  return audience.ok &&
    hasCompleteSeries &&
    audience.audience === "kids" &&
    record.approvalStatus === "approved" &&
    record.approvalReviewerId === "system:zikr-video-factory" &&
    /^[a-f0-9]{64}$/i.test(snapshotHash) &&
    record.kidsVideoQaStatus === "passed" &&
    qa?.status === "passed" &&
    qa.snapshotHash === snapshotHash &&
    qa.engine === "zikr_video_factory" &&
    qa.engineVersion === "2026-11-07-auto-qa-v1" &&
    qa.reviewedAt === reviewAt &&
    review?.mode === "automated" &&
    review.reviewerId === "system:zikr-video-factory" &&
    review.engine === "zikr_video_factory" &&
    review.engineVersion === "2026-11-07-auto-qa-v1" &&
    review.snapshotHash === snapshotHash &&
    review.reviewedAt === reviewAt &&
    Number.isFinite(Date.parse(reviewAt)) &&
    requiredChecks.every((key) => qaChecks?.[key] === true && review[key] === true);
}

function isKidsVideoContent(content: unknown): boolean {
  return isKidsVideoContentMarker(content);
}

function getDuplicateCanonicalRequestId(request: VideoGenerationRequest): string | null {
  if (request.status !== "cancelled" || !/duplicate generated content/i.test(request.error_message ?? "")) return null;
  const match = (request.error_details ?? "").match(/belongs to request\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

function isSafeGeneratedAssetDeletionCandidate(request: VideoGenerationRequest, canManageKids: boolean): boolean {
  const audience = resolveVideoRequestAudience(request.content);
  if (!audience.ok || (audience.audience === "kids" && !canManageKids)) return false;
  const content = request.content && typeof request.content === "object" && !Array.isArray(request.content)
    ? request.content as Record<string, unknown> : {};
  const duplicate = request.status === "cancelled" && Boolean(getDuplicateCanonicalRequestId(request));
  const qaFailed = request.status === "completed" && content.approvalStatus === "qa_failed";
  const pendingReview = request.status === "completed" && content.approvalStatus === "awaiting_human_review";
  const terminalWithAsset = (request.status === "failed" || request.status === "cancelled") && Boolean(request.video_url);
  const contentPreparation = prepareGeneratedVideoContentForDeletion(request.content, request.video_url ?? "");
  const storedThumbnail = request.stored_thumbnail_url ?? null;
  if ((!duplicate && !qaFailed && !pendingReview && !terminalWithAsset) || !request.video_url ||
    storedThumbnail !== null || request.youtube_id || request.facebook_id ||
    request.heygen_video_id || request.provider_job_id || !contentPreparation.ok) return false;
  try {
    const url = new URL(request.video_url);
    const segments = url.pathname.split("/").filter(Boolean);
    return url.protocol === "https:" &&
      url.hostname.toLowerCase() === "res.cloudinary.com" &&
      !url.username && !url.password && !url.search && !url.hash &&
      segments.length === 5 &&
      segments[1] === "video" && segments[2] === "upload" &&
      /^v\d+$/.test(segments[3]) &&
      /^auto-[a-z0-9-]+\.mp4$/i.test(segments[4]);
  } catch {
    return false;
  }
}

function isQaFailedGeneratedVideo(request: VideoGenerationRequest): boolean {
  const content = request.content && typeof request.content === "object" && !Array.isArray(request.content)
    ? request.content as Record<string, unknown> : {};
  return request.status === "completed" && content.approvalStatus === "qa_failed";
}

function isSafelyDeletable(request: VideoGenerationRequest, canManageKids: boolean): boolean {
  const audience = resolveVideoRequestAudience(request.content);
  const contentPreparation = prepareGeneratedVideoContentForDeletion(request.content, "");
  return audience.ok && (audience.audience !== "kids" || canManageKids) &&
    (request.status === "failed" || request.status === "cancelled") &&
    !request.video_url && (request.stored_thumbnail_url ?? null) === null &&
    !request.youtube_id && !request.facebook_id &&
    !request.heygen_video_id && !request.provider_job_id &&
    contentPreparation.ok;
}

const STATUS_LABELS: Record<Status, string> = {
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  completed: "مكتمل",
  retry_wait: "إعادة المحاولة لاحقًا",
  failed: "فشل",
  cancelled: "ملغى",
};

const STATUS_CLASSES: Record<Status, string> = {
  pending: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  processing: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  completed: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  retry_wait: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  failed: "border-red-500/25 bg-red-500/10 text-red-300",
  cancelled: "border-slate-500/25 bg-slate-500/10 text-slate-300",
};

function getProjectDeletionForUi(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const marker = (value as Record<string, unknown>).projectMediaDeletion;
  return marker && typeof marker === "object" && !Array.isArray(marker) ? marker as Record<string, unknown> : {};
}

function hasProjectVideoCopyForUi(request: VideoGenerationRequest): boolean {
  const content = request.content && typeof request.content === "object" && !Array.isArray(request.content)
    ? request.content as Record<string, unknown> : {};
  const marker = getProjectDeletionForUi(content);
  const retention = content.storageRetention && typeof content.storageRetention === "object" && !Array.isArray(content.storageRetention)
    ? content.storageRetention as Record<string, unknown> : {};
  const embeddedVideoUrl = [content.generatedVideoUrl, content.videoUrl, content.video_url]
    .some((value) => typeof value === "string" && value.trim().length > 0);
  return Boolean(request.video_url) || embeddedVideoUrl ||
    (marker.state === "purging" && (
      typeof marker.assetUrl === "string" ||
      (Array.isArray(marker.storagePaths) && marker.storagePaths.length > 0)
    )) ||
    (retention.state !== "purged" && retention.bucket === "videos" && typeof retention.path === "string" && retention.path.startsWith("automated/"));
}

type AdminVideoRequestsClientProps = { canManageKids: boolean; canDelete?: boolean; reviewOnly?: boolean };

export default function AdminVideoRequestsClient({ canManageKids, canDelete = false, reviewOnly = false }: AdminVideoRequestsClientProps) {
  const [requests, setRequests] = useState<VideoGenerationRequest[]>([]);
  const [filter, setFilter] = useState<QueueFilter>(reviewOnly ? "review" : "all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(() => new Set());
  const [batchApprovalChecks, setBatchApprovalChecks] = useState<Record<ApprovalCheckKey, boolean>>({
    sourceVerified: false, audioReviewed: false, visualsReviewed: false, captionsReviewed: false, rightsReviewed: false,
  });
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllReviewRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<VideoGenerationRequest | null>(null);
  const [approvalChecks, setApprovalChecks] = useState<Record<ApprovalCheckKey, boolean>>({
    sourceVerified: false, audioReviewed: false, visualsReviewed: false, captionsReviewed: false, rightsReviewed: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setSelectedReviewIds(new Set());
    setError("");
    try {
      const response = await fetch("/api/admin/videos", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل طابور الفيديو.");
      }
      const nextRequests: VideoGenerationRequest[] = Array.isArray(data) ? data : [];
      setRequests(nextRequests);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل طابور الفيديو.");
      setRequests([]);
      setSelectedIds(new Set());
      setSelectedReviewIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      processing: requests.filter((r) => r.status === "processing").length,
      completed: requests.filter((r) => r.status === "completed").length,
      retry_wait: requests.filter((r) => r.status === "retry_wait").length,
      failed: requests.filter((r) => r.status === "failed").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
      review: requests.filter((r) => r.stale_processing || (r.status === "completed" && Boolean(r.video_url) && !isContentApproved(r.content)) || r.status === "failed" || r.status === "cancelled").length,
    }),
    [requests],
  );

  const visible = filter === "all"
    ? requests
    : filter === "review"
      ? requests.filter((request) => request.stale_processing || (request.status === "completed" && Boolean(request.video_url) && !isContentApproved(request.content)) || request.status === "failed" || request.status === "cancelled")
      : requests.filter((request) => request.status === filter);
  const eligibleVisible = canDelete
    ? visible.filter((request) =>
        isSafelyDeletable(request, canManageKids) ||
        isSafeGeneratedAssetDeletionCandidate(request, canManageKids),
      )
    : [];
  const selectedVisibleCount = eligibleVisible.filter((request) => selectedIds.has(request.id)).length;
  const reviewEligibleVisible = visible.filter((request) => {
    const audience = resolveVideoRequestAudience(request.content);
    return request.status === "completed" &&
      Boolean(request.video_url) &&
      !isContentApproved(request.content) &&
      audience.ok &&
      audience.audience !== "kids";
  });
  const reviewEligibleIds = new Set(reviewEligibleVisible.map((request) => request.id));
  const selectedReviewVisibleCount = reviewEligibleVisible.filter((request) => selectedReviewIds.has(request.id)).length;

  useEffect(() => {
    if (selectAllReviewRef.current) {
      selectAllReviewRef.current.indeterminate =
        selectedReviewVisibleCount > 0 && selectedReviewVisibleCount < reviewEligibleVisible.length;
    }
  }, [reviewEligibleVisible.length, selectedReviewVisibleCount]);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < eligibleVisible.length;
  }, [eligibleVisible.length, selectedVisibleCount]);

  function applyFilter(nextFilter: QueueFilter) {
    setFilter(nextFilter);
    setSelectedIds(new Set());
    setSelectedReviewIds(new Set());
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function deleteSelected() {
    const selected = eligibleVisible.filter((request) => selectedIds.has(request.id));
    if (!selected.length || busyId || !window.confirm(`سيتم حذف ${selected.length} سجل طلب منتهٍ فقط. ستُرفض ذريًا أي حالة تغيّرت أو لها وسيط/مرجع. متابعة؟`)) return;
    setError(""); setMessage("");
    const deleted: string[] = [];
    const failures: string[] = [];
    const cleanupPending: string[] = [];
    const preservedForCanonical: string[] = [];
    for (const request of selected) {
      setBusyId(request.id);
      try {
        const response = await fetch(`/api/admin/videos/${encodeURIComponent(request.id)}`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true, expectedUpdatedAt: request.updated_at }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok && data.error === "step_up_required" && redirectToAdminStepUp(data.nextPath)) return;
        if (!response.ok) throw new Error(data.error || "فشل الحذف");
        deleted.push(request.id);
        if (data.cloudinaryCleanupPending === true) cleanupPending.push(request.title);
        if (data.mediaPreservedForCanonicalRequest === true) preservedForCanonical.push(request.title);
      } catch (cause) {
        failures.push(`${request.title}: ${cause instanceof Error ? cause.message : "فشل الحذف"}`);
      }
    }
    setBusyId(null);
    setSelectedIds(new Set());
    setMessage(
      `تم حذف ${deleted.length} من ${selected.length} طلب.` +
      (preservedForCanonical.length ? ` تم الاحتفاظ بملف ${preservedForCanonical.length} نسخة مكررة لأنه مستخدم في الطلب الأصلي.` : "") +
      (cleanupPending.length ? ` ملفات تحتاج إعادة تسوية مع Cloudinary: ${cleanupPending.join("، ")}.` : "") +
      (failures.length ? ` تعذر حذف ${failures.length}; راجع الأخطاء أدناه.` : ""),
    );
    if (failures.length) setError(failures.join("\n"));
    await load();
  }

  async function deleteRequest(request: VideoGenerationRequest) {
    const generatedAsset = isSafeGeneratedAssetDeletionCandidate(request, canManageKids);
    const qaFailedAsset = isQaFailedGeneratedVideo(request);
    const duplicateRender = request.status === "cancelled" && Boolean(getDuplicateCanonicalRequestId(request));
    const requestContent = request.content && typeof request.content === "object" && !Array.isArray(request.content)
      ? request.content as Record<string, unknown> : {};
    const pendingReview = request.status === "completed" && requestContent.approvalStatus === "awaiting_human_review";
    if (!canDelete || (!isSafelyDeletable(request, canManageKids) && !generatedAsset)) return;
    const confirmation = generatedAsset
      ? qaFailedAsset
        ? `هذا الفيديو مكتمل تقنيًا لكنه رُفض في فحص الجودة ولم يُنشر. سيُحذف ملفه المولّد من Cloudinary وسجل الطلب بعد التأكد من عدم ارتباطه بأي منشور أو مكتبة. لا يمكن استعادته بعد الحذف. متابعة؟`
        : pendingReview
          ? `هذا الفيديو مكتمل لكنه لم يجتز شروط اعتماد الجودة الآلي أو لا يملك سجلًا مطابقًا. لن يُحذف ملفه إلا بعد إثبات ملكيته وخلوه من أي رابط للمكتبة أو النشر. لا يمكن التراجع عن الحذف. متابعة؟`
          : duplicateRender
            ? `سيُحذف ملف النسخة المكررة ${request.title} نهائيًا من Cloudinary ثم سجلها، بعد التحقق من عدم ارتباطها بالمكتبة أو أي منشور. سيبقى الفيديو الأصلي المكتمل كما هو. متابعة؟`
            : `الطلب ${request.status === "failed" ? "فشل" : "أُلغي"} وما زال له ملف مولّد غير مرتبط بالنشر. سيُحذف الملف من Cloudinary وسجل الطلب بعد فحص الملكية والمراجع. متابعة؟`
      : `تأكيد حذف سجل الفيديو المنتهي «${request.title}»؟ لن يُحذف أي ملف أو سجل نشر.`;
    if (!window.confirm(confirmation)) return;
    setBusyId(request.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/videos/${encodeURIComponent(request.id)}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, expectedUpdatedAt: request.updated_at }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && data.error === "step_up_required" && redirectToAdminStepUp(data.nextPath)) return;
      if (!response.ok) throw new Error(data.error || "تعذر حذف طلب الفيديو.");
      if (data.mediaPreservedForCanonicalRequest === true) {
        setMessage("تم حذف سجل النسخة المكررة نهائيًا، وتم الاحتفاظ بملف الفيديو الأصلي لأنه مشترك مع الطلب الأساسي.");
      } else if (generatedAsset && data.cloudinaryCleanupPending === true) {
        setMessage("حُذف سجل الفيديو بعد فحص المراجع، لكن Cloudinary لم يؤكد حذف الملف. تم تسجيل حالة تحتاج مراجعة؛ لا تعِد محاولة الحذف قبل مراجعة سجل التدقيق.");
      } else {
        setMessage(generatedAsset
          ? qaFailedAsset
            ? "تم حذف ملف الفيديو المرفوض في فحص الجودة وسجل طلبه بعد التحقق من عدم وجود أي مراجع. لم يتأثر أي فيديو منشور."
            : pendingReview
              ? "تم حذف ملف الفيديو غير المعتمد وسجل طلبه بعد إثبات الملكية وخلوه من مراجع المكتبة والنشر."
              : duplicateRender
                ? "تم حذف ملف النسخة المكررة من Cloudinary وسجلها بعد فحص المراجع. الفيديو الأصلي لم يتأثر."
                : "تم حذف ملف الفيديو الفاشل أو الملغى وسجل طلبه بعد التحقق من الملكية وخلوه من مراجع النشر."
          : "حُذف سجل الطلب بعد التحقق الذري من عدم وجود وسائط أو مراجع نشر.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف طلب الفيديو.");
    } finally { setBusyId(null); }
  }

  async function deleteProjectCopy(request: VideoGenerationRequest) {
    const content = request.content && typeof request.content === "object" && !Array.isArray(request.content)
      ? request.content as Record<string, unknown> : {};
    const deletion = content.projectMediaDeletion && typeof content.projectMediaDeletion === "object" && !Array.isArray(content.projectMediaDeletion)
      ? content.projectMediaDeletion as Record<string, unknown> : {};
    const retention = content.storageRetention && typeof content.storageRetention === "object" && !Array.isArray(content.storageRetention)
      ? content.storageRetention as Record<string, unknown> : {};
    const hasProjectCopy = Boolean(request.video_url) ||
      (deletion.state === "purging" && (
        typeof deletion.assetUrl === "string" ||
        (Array.isArray(deletion.storagePaths) && deletion.storagePaths.length > 0)
      )) ||
      (retention.bucket === "videos" && typeof retention.path === "string" && retention.path.startsWith("automated/"));
    if (!canDelete || !hasProjectCopy || busyId) return;
    const pendingRetry = deletion.state === "purging";
    const confirmation = pendingRetry
      ? `هناك تنظيف سابق لم يكتمل بالكامل للفيديو «${request.title}». أعد المحاولة لإكمال حذف نسخة المشروع فقط. لن يتم حذف منشورات أو فيديوهات YouTube أو Facebook.`
      : `سيتم حذف ملف الفيديو من ذاكرة ZIKR وCloudinary ونسخة التخزين المؤقتة في Supabase، مع الاحتفاظ بسجل المصدر والاعتماد ومعرفات YouTube وFacebook والمنشورات الخارجية كما هي. تأكيد حذف نسخة المشروع للفيديو «${request.title}»؟`;
    if (!window.confirm(confirmation)) return;
    setBusyId(request.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/videos/${encodeURIComponent(request.id)}/project-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, expectedUpdatedAt: request.updated_at }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && data.error === "step_up_required" && redirectToAdminStepUp(data.nextPath)) return;
      if (!response.ok && response.status !== 202) throw new Error(data.error || "تعذر حذف نسخة المشروع.");
      setMessage(data.message || (data.cleanupPending
        ? "تم فصل نسخة المشروع، ويتبقى تنظيف تخزين يحتاج إعادة محاولة."
        : "تم حذف نسخة المشروع مع الحفاظ على السوشيال."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف نسخة المشروع.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveSelectedForPublishing() {
    const selected = reviewEligibleVisible.filter((request) => selectedReviewIds.has(request.id));
    if (!selected.length || busyId || APPROVAL_CHECKS.some((check) => !batchApprovalChecks[check.key])) return;
    if (!window.confirm(`تأكيد أنك شاهدت وراجعت كل فيديو عام محدد كاملًا، واستمعت للصوت، وراجعت المصدر والترجمة والحقوق؟ سيتم إرسال ${selected.length} طلب اعتماد فرديًا. فيديوهات الأطفال لا تدخل هذا المسار؛ اعتمادها آلي فقط.`)) return;

    setError(""); setMessage("");
    const approved: string[] = [];
    const failures: string[] = [];
    for (const item of selected) {
      setBusyId(item.id);
      try {
        const response = await fetch("/api/admin/video-generation", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, action: "approve_publish", qaChecklist: batchApprovalChecks }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok && data.error === "step_up_required" && redirectToAdminStepUp(data.nextPath)) return;
        if (!response.ok) throw new Error(data.error || "تعذر اعتماد الفيديو.");
        approved.push(item.title);
      } catch (cause) {
        failures.push(`${item.title}: ${cause instanceof Error ? cause.message : "تعذر الاعتماد"}`);
      }
    }
    setBusyId(null);
    setSelectedReviewIds(new Set());
    setBatchApprovalChecks({ sourceVerified: false, audioReviewed: false, visualsReviewed: false, captionsReviewed: false, rightsReviewed: false });
    setMessage(`تم اعتماد ${approved.length} من ${selected.length} فيديو عام بعد إرسالها منفردة إلى مسار الاعتماد الرسمي.${failures.length ? ` تعذر اعتماد ${failures.length} فيديو؛ راجع التفاصيل أدناه.` : ""}`);
    if (failures.length) setError(failures.join("\n"));
    await load();
  }

  async function retry(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/videos/${encodeURIComponent(id)}/retry`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && data.error === "step_up_required" && redirectToAdminStepUp(data.nextPath)) return;
      if (!response.ok) throw new Error(data.error || "تعذر إعادة المحاولة.");
      setMessage("تمت إعادة العملية إلى الطابور.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إعادة المحاولة.");
    } finally {
      setBusyId(null);
    }
  }

  async function openDetails(id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/videos/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تحميل التفاصيل.");
      setApprovalChecks({ sourceVerified: false, audioReviewed: false, visualsReviewed: false, captionsReviewed: false, rightsReviewed: false });
      setDetails(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل التفاصيل.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveForPublishing() {
    if (!details || APPROVAL_CHECKS.some((check) => !approvalChecks[check.key])) return;
    setBusyId(details.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/video-generation", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: details.id, action: "approve_publish", qaChecklist: approvalChecks }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok && responseData.error === "step_up_required" && redirectToAdminStepUp(responseData.nextPath)) return;
      if (!response.ok) throw new Error(responseData.error || "تعذر اعتماد الفيديو للنشر.");
      setMessage("تم تسجيل مراجعة الفيديو العام. سيُعاد فحص المصدر والوسائط قبل أي نشر مجدول؛ فيديوهات الأطفال تعتمد آليًا فقط.");
      setDetails(null); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر اعتماد الفيديو للنشر.");
    } finally { setBusyId(null); }
  }

  return (
    <Container className="space-y-7 py-10 text-right" dir="rtl">
      <nav aria-label="تنقل استوديو الفيديو" className="sticky top-0 z-20 -mx-2 overflow-x-auto rounded-2xl border border-brand-gold/10 bg-brand-emeraldDeep/95 p-2 backdrop-blur">
        <div className="flex min-w-max items-center gap-2">
          <a href="#queue" className="rounded-xl border border-brand-gold/25 bg-brand-gold/10 px-4 py-2 text-sm font-semibold text-brand-gold">الطابور</a>
          <a href="#qa" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">ضبط الجودة</a>
          <a href="#templates" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">القوالب</a>
          <a href="#visuals" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">العناصر المرئية</a>
          <a href="#voices" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">الأصوات</a>
          <span className="mx-1 h-6 w-px bg-brand-gold/10" aria-hidden="true" />
          <Link href="/admin/video/studio" className="rounded-xl border border-brand-gold/20 px-4 py-2 text-sm text-brand-gold hover:bg-brand-gold/10">استوديو الإنشاء</Link>
          <Link href="/admin/video/review" className="rounded-xl border border-brand-gold/20 px-4 py-2 text-sm text-brand-gold hover:bg-brand-gold/10">المراجعة والاعتماد</Link>
          <Link href="/admin/social" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">النشر الاجتماعي</Link>
          <Link href="/admin/automation" className="rounded-xl border border-brand-gold/10 px-4 py-2 text-sm text-brand-cream/65 hover:border-brand-gold/25 hover:text-brand-gold">التشغيل الآلي</Link>
        </div>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-brand-cream/30">{reviewOnly ? "مراجعة الفيديو" : "طابور الفيديو"}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-gold">{reviewOnly ? "مراجعة الفيديوهات المتوقفة والجاهزة للنشر" : "طابور توليد الفيديو"}</h1>
          <p className="mt-2 text-sm leading-7 text-brand-cream/50">تابع طلبات التوليد وافتح الفيديو لمراجعته. يمكنك حذف نسخة ZIKR الداخلية في أي مرحلة مع الاحتفاظ بمنشورات YouTube وFacebook وسجلاتها الخارجية، كما يمكنك تحديد عدة فيديوهات جاهزة واعتمادها جماعيًا عبر الفحوص الرسمية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/video/studio" className="rounded-xl border border-brand-gold/25 bg-brand-gold/10 px-4 py-2 text-sm font-semibold text-brand-gold hover:bg-brand-gold/20">استوديو إنشاء الفيديو</Link>
          <Link href="/admin/social" className="rounded-xl border border-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10">مركز النشر</Link>
          <Link href={reviewOnly ? "/admin/video/requests" : "/admin/video/review"} className="rounded-xl border border-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/10">
            {reviewOnly ? "كل طلبات الفيديو" : "طلبات تحتاج مراجعة"}
          </Link>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>تحديث</Button>
        </div>
      </header>

      <PurgeGeneratedVideosControl onCompleted={load} />

      {error && <div role="alert" className="whitespace-pre-wrap break-words rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}

      <section id="queue" className="grid grid-cols-2 gap-3 md:grid-cols-6 scroll-mt-24">
        <button type="button" onClick={() => applyFilter("review")} className={`rounded-2xl border p-4 text-right transition ${filter === "review" ? "border-brand-gold/40 bg-brand-gold/10" : "border-brand-gold/10 bg-black/15"}`}>
          <span className="text-xs text-brand-cream/45">مراجعة المتوقفة</span>
          <span className="mt-1 block text-2xl font-bold text-brand-gold">{counts.review}</span>
        </button>
        {(["all", "pending", "processing", "retry_wait", "completed", "failed", "cancelled"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => applyFilter(status)}
            className={`rounded-2xl border p-4 text-right transition ${filter === status ? "border-brand-gold/40 bg-brand-gold/10" : "border-brand-gold/10 bg-black/15"}`}
          >
            <span className="text-xs text-brand-cream/45">{status === "all" ? "إجمالي" : STATUS_LABELS[status]}</span>
            <span className="mt-1 block text-2xl font-bold text-brand-gold">{counts[status]}</span>
          </button>
        ))}
      </section>

      {reviewEligibleVisible.length > 0 && (
        <Card className="space-y-4 border-sky-400/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sky-200">المراجعة والاعتماد الجماعي</h2>
              <p className="mt-1 text-xs leading-6 text-brand-cream/55">
                حدّد كل الفيديوهات التي شاهدتها وراجعتها، ثم أكّد قائمة الفحوص مرة واحدة. سيظل كل فيديو يمر بفحوص المصدر والجودة وصلاحيات الأطفال بشكل مستقل.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-cream/75">
              <input
                ref={selectAllReviewRef}
                type="checkbox"
                checked={reviewEligibleVisible.length > 0 && reviewEligibleVisible.every((request) => selectedReviewIds.has(request.id))}
                onChange={(event) => {
                  const checked = event.target.checked;
                  const ids = new Set(reviewEligibleVisible.map((request) => request.id));
                  setSelectedReviewIds((current) => {
                    const next = new Set(current);
                    for (const selectedId of ids) {
                      if (checked) next.add(selectedId);
                      else next.delete(selectedId);
                    }
                    return next;
                  });
                }}
                className="h-4 w-4 accent-sky-300"
                aria-label="تحديد كل الفيديوهات الجاهزة للمراجعة"
              />
              تحديد كل الجاهز ({reviewEligibleVisible.length})
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {APPROVAL_CHECKS.map((check) => (
              <label key={check.key} className="flex cursor-pointer items-start gap-2 rounded-xl border border-sky-400/10 bg-black/15 p-3 text-xs leading-6 text-brand-cream/75">
                <input
                  type="checkbox"
                  checked={batchApprovalChecks[check.key]}
                  onChange={(event) => setBatchApprovalChecks((current) => ({ ...current, [check.key]: event.target.checked }))}
                  className="mt-1 h-4 w-4 accent-sky-300"
                />
                <span>{check.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-brand-cream/45">المحدد للمراجعة: {selectedReviewVisibleCount}</span>
            <Button
              variant="primary"
              disabled={!selectedReviewVisibleCount || busyId !== null || APPROVAL_CHECKS.some((check) => !batchApprovalChecks[check.key])}
              onClick={() => void approveSelectedForPublishing()}
            >
              مراجعة واعتماد المحدد ({selectedReviewVisibleCount})
            </Button>
          </div>
        </Card>
      )}

      <section className="space-y-3">
        {canDelete && eligibleVisible.length > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-gold/15 p-4">
            <label className="flex items-center gap-3 text-sm text-brand-cream/75">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={eligibleVisible.length > 0 && eligibleVisible.every((request) => selectedIds.has(request.id))}
                onChange={(event) => {
                  const checked = event.target.checked;
                  const visibleIds = new Set(eligibleVisible.map((request) => request.id));
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    for (const id of visibleIds) {
                      if (checked) next.add(id);
                      else next.delete(id);
                    }
                    return next;
                  });
                }}
                className="h-4 w-4 accent-amber-300"
                aria-label="تحديد كل سجلات الطلبات المنتهية الآمنة الظاهرة"
              />
              تحديد السجلات المنتهية الآمنة ({eligibleVisible.length})
            </label>
            <Button variant="outline" disabled={busyId !== null || !selectedVisibleCount} onClick={() => void deleteSelected()}>
              حذف المحدد ({selectedVisibleCount})
            </Button>
          </Card>
        )}
        {loading && <Card className="p-8 text-center text-sm text-brand-cream/45">جاري تحميل الطابور…</Card>}
        {!loading && visible.length === 0 && (
          <Card className="p-10 text-center">
            <p className="font-semibold text-brand-cream/75">لا توجد عمليات مطابقة.</p>
            <p className="mt-2 text-sm text-brand-cream/40">أنشئ طلبًا من استوديو الفيديو أو انتظر التشغيل التلقائي.</p>
          </Card>
        )}

        {!loading && visible.map((request) => {
          const status = request.status as Status;
          return (
            <Card key={request.id} className="border-brand-gold/10 p-5">
              {request.thumbnail_url && (
                <div className="mb-4 flex items-center gap-4 rounded-xl border border-brand-gold/10 bg-black/20 p-2">
                  <Image
                    src={request.thumbnail_url}
                    alt={`معاينة ${request.title}`}
                    width={80}
                    height={112}
                    sizes="80px"
                    unoptimized
                    className="h-28 w-20 rounded-lg bg-black object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-brand-cream/40">صورة حقيقية من إطار الفيديو</p>
                    <p className="mt-1 line-clamp-2 text-sm text-brand-cream/75">{request.title}</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {reviewEligibleIds.has(request.id) && (
                      <input
                        type="checkbox"
                        checked={selectedReviewIds.has(request.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedReviewIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(request.id); else next.delete(request.id);
                            return next;
                          });
                        }}
                        disabled={busyId !== null}
                        className="h-4 w-4 accent-sky-300"
                        aria-label={`تحديد ${request.title} للمراجعة الجماعية`}
                      />
                    )}
                    {canDelete && isSafelyDeletable(request, canManageKids) && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={(event) => toggleSelected(request.id, event.target.checked)}
                        disabled={busyId !== null}
                        className="h-4 w-4 accent-amber-300"
                        aria-label={`تحديد طلب الفيديو ${request.title} للحذف الآمن`}
                      />
                    )}
                    <h2 className="font-bold text-brand-gold">{request.title}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_CLASSES[status] ?? STATUS_CLASSES.failed}`}>
                      {STATUS_LABELS[status] ?? request.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-brand-cream/55">{request.description || "بدون وصف"}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-cream/35">
                    <span>الفئة: {request.category}</span>
                    <span>{new Date(request.created_at).toLocaleString("ar-EG-u-nu-latn")}</span>
                    {request.stale_processing && <span className="text-amber-300">متوقف: تجاوز مهلة العامل</span>}
                    {request.video_url && <a href={request.video_url} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">فتح الفيديو</a>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={busyId === request.id} onClick={() => void openDetails(request.id)}>التفاصيل</Button>
                  {request.status === "completed" && request.video_url && !isContentApproved(request.content) &&
                    isGeneralAudienceVideoRequest(request.content) && (
                      <Button variant="primary" disabled={busyId === request.id} onClick={() => void openDetails(request.id)}>
                        مراجعة واعتماد الفيديو العام
                      </Button>
                    )}
                  {request.status === "failed" && (() => {
                    const retryAudience = resolveVideoRequestAudience(request.content);
                    const canRetry = retryAudience.ok && (retryAudience.audience !== "kids" || canManageKids);
                    return canRetry ? <Button variant="primary" disabled={busyId === request.id} onClick={() => void retry(request.id)}>{busyId === request.id ? "جاري التنفيذ…" : "إعادة المحاولة"}</Button> : null;
                  })()}
                  {canDelete && hasProjectVideoCopyForUi(request) && (
                    <Button variant="outline" disabled={busyId !== null} onClick={() => void deleteProjectCopy(request)}>
                      حذف نسخة المشروع فقط
                    </Button>
                  )}
                  {canDelete && (isSafelyDeletable(request, canManageKids) || isSafeGeneratedAssetDeletionCandidate(request, canManageKids)) && (
                    <Button variant="outline" disabled={busyId === request.id} onClick={() => void deleteRequest(request)}>
                      {isSafeGeneratedAssetDeletionCandidate(request, canManageKids)
                        ? isQaFailedGeneratedVideo(request)
                          ? "حذف فيديو فشل فحص الجودة وملفه نهائيًا"
                          : request.status === "completed" && (request.content as Record<string, unknown> | null)?.approvalStatus === "awaiting_human_review"
                            ? "حذف الفيديو غير المعتمد وملفه نهائيًا"
                            : getDuplicateCanonicalRequestId(request)
                              ? "حذف الفيديو المكرر وملفه نهائيًا"
                              : request.status === "failed"
                                ? "حذف الفيديو الفاشل وملفه نهائيًا"
                                : "حذف الفيديو الملغى وملفه نهائيًا"
                        : "حذف سجل الطلب"}
                    </Button>
                  )}
                </div>
              </div>
              {request.error_message && (
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/5 p-3 text-xs leading-6 text-red-200">
                  <div>{request.error_message}</div>
                  {request.error_details && <pre className="mt-2 whitespace-pre-wrap break-words text-red-200/70">{request.error_details}</pre>}
                  {getDuplicateCanonicalRequestId(request) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-amber-100/85">
                      <span>هذا رندر مكرر؛ لم يُنشر كعنصر مستقل. افتح الطلب الأصلي لمراجعة النسخة المعتمدة بدل إعادة نشر نسخة مكررة.</span>
                      <Button variant="outline" disabled={busyId !== null} onClick={() => void openDetails(getDuplicateCanonicalRequestId(request)!)}>فتح الطلب الأصلي للمراجعة</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </section>

      <section id="qa" className="grid gap-4 lg:grid-cols-2 scroll-mt-24">
        <Card className="border-brand-gold/10 p-5">
          <h2 className="text-lg font-bold text-brand-gold">ضبط الجودة</h2>
          <p className="mt-2 text-sm leading-7 text-brand-cream/50">الـworker يرفض الفيديو قبل اكتماله إذا فشل أي فحص أساسي.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["مطابقة النص مع المصدر", "وجود مسار صوتي", "التأكد من عدم صمت الصوت", "الدقة والترميز الصحيح", "صلاحية ملف MP4", "نجاح رفع التخزين"].map(item => (
              <div key={item} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/80">✓ {item}</div>
            ))}
          </div>
        </Card>
        <Card id="templates" className="border-brand-gold/10 p-5 scroll-mt-24">
          <h2 className="text-lg font-bold text-brand-gold">القوالب</h2>
          <p className="mt-2 text-sm leading-7 text-brand-cream/50">القوالب الحالية المستخدمة في التصيير المحلي.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[["هادئ","calm.svg"],["فجر","dawn.svg"],["ليل","night.svg"],["ذهبي","gold.svg"]].map(([label,file]) => (
              <div key={file} className="rounded-xl border border-brand-gold/10 bg-black/15 p-3">
                <p className="font-semibold text-brand-cream/80">{label}</p>
                <p className="mt-1 font-mono text-[10px] text-brand-cream/25">{file}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card id="visuals" className="border-brand-gold/10 p-5 scroll-mt-24">
          <h2 className="text-lg font-bold text-brand-gold">العناصر المرئية</h2>
          <p className="mt-2 text-sm leading-7 text-brand-cream/50">ترتيب مزودي المشاهد قبل السقوط إلى قالب FFmpeg الحتمي.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["LTX السريع","Wan","ComfyUI","مزود مرئي مجاني","قالب FFmpeg"].map(item => (
              <span key={item} className="rounded-full border border-brand-gold/10 bg-black/15 px-3 py-1.5 text-xs text-brand-cream/70">{item}</span>
            ))}
          </div>
        </Card>
        <Card id="voices" className="border-brand-gold/10 p-5 scroll-mt-24">
          <h2 className="text-lg font-bold text-brand-gold">الأصوات</h2>
          <p className="mt-2 text-sm leading-7 text-brand-cream/50">أصوات السرد العربية الافتراضية داخل العامل.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["العربية الفصحى — رجل — Hamed","العربية المصرية — رجل — Shakir"].map(item => (
              <div key={item} className="rounded-xl border border-brand-gold/10 bg-black/15 px-3 py-2 text-xs text-brand-cream/70">{item}</div>
            ))}
          </div>
        </Card>
      </section>

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-auto p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-brand-gold">تفاصيل عملية التوليد</h2>
              <Button variant="outline" onClick={() => setDetails(null)}>إغلاق</Button>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div><dt className="text-brand-cream/35">المعرف</dt><dd className="mt-1 break-all font-mono text-brand-cream/75">{details.id}</dd></div>
              <div><dt className="text-brand-cream/35">الحالة</dt><dd className="mt-1 text-brand-cream/75">{details.status}</dd></div>
              <div><dt className="text-brand-cream/35">العنوان</dt><dd className="mt-1 text-brand-cream/75">{details.title}</dd></div>
              <div><dt className="text-brand-cream/35">التصنيف</dt><dd className="mt-1 text-brand-cream/75">{details.category}</dd></div>
              <div><dt className="text-brand-cream/35">تاريخ الإنشاء</dt><dd className="mt-1 text-brand-cream/75">{new Date(details.created_at).toLocaleString("ar-EG-u-nu-latn")}</dd></div>
              <div><dt className="text-brand-cream/35">آخر تحديث</dt><dd className="mt-1 text-brand-cream/75">{new Date(details.updated_at).toLocaleString("ar-EG-u-nu-latn")}</dd></div>
            </dl>
            <VideoTechnicalQaPanel content={details.content} />
            {details.video_url && (
              <div className="mt-5 space-y-3">
                <video controls preload="metadata" src={details.video_url} className="max-h-[55vh] w-full rounded-xl border border-brand-gold/15 bg-black" aria-label="معاينة الفيديو قبل النشر">
                  المتصفح لا يدعم تشغيل الفيديو.
                </video>
                <a href={details.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl border border-emerald-500/20 px-4 py-2 text-sm text-emerald-300">فتح ملف الفيديو</a>
              </div>
            )}
            {details.status === "completed" && details.video_url && (
              <section className="mt-6 space-y-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
                {isContentApproved(details.content) ? (
                  <div role="status" className="font-semibold text-emerald-200">
                    {isKidsVideoContent(details.content)
                      ? "اجتاز فيديو الأطفال فحوص الجودة الآلية الخمسة وفحص أمان الأطفال وتطابقت بصمة المصدر والوسائط؛ لا يحتاج اعتمادًا بشريًا."
                      : "سجل اعتماد الفيديو العام مكتمل؛ سيُعاد التحقق من المصدر والوسائط قبل النشر."}
                  </div>
                ) : isKidsVideoContent(details.content) ? (
                  <div role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-7 text-amber-100/80">
                    فيديو الأطفال ينتظر اجتياز فحوص الجودة الآلية الخمسة وفحص أمان الأطفال وبيانات السلسلة وبصمة المصدر. لن يظهر زر اعتماد يدوي؛ سيُنشر فقط بعد نجاح الفحوص تلقائيًا.
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-brand-gold">مراجعة واعتماد الفيديو العام</h3>
                    <p className="text-sm leading-6 text-brand-cream/60">شاهد الفيديو كاملًا واستمع إلى الصوت، ثم استكمل الفحوص اللازمة قبل تسجيل الاعتماد.</p>
                    <div className="space-y-3">
                      {APPROVAL_CHECKS.map((check) => (
                        <label key={check.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-gold/10 bg-black/15 p-3 text-sm leading-6 text-brand-cream/80">
                          <input type="checkbox" checked={approvalChecks[check.key]} onChange={(event) => setApprovalChecks((current) => ({ ...current, [check.key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-amber-300" />
                          <span>{check.label}</span>
                        </label>
                      ))}
                    </div>
                    <Button variant="primary" disabled={busyId === details.id || APPROVAL_CHECKS.some((check) => !approvalChecks[check.key])} onClick={() => void approveForPublishing()}>
                      {busyId === details.id ? "جاري تسجيل الاعتماد…" : "اعتماد الفيديو للنشر"}
                    </Button>
                  </>
                )}
              </section>
            )}
            {details.content !== null && details.content !== undefined ? <pre className="mt-5 overflow-auto rounded-xl border border-brand-gold/10 bg-black/30 p-4 text-xs text-brand-cream/55">{JSON.stringify(details.content, null, 2)}</pre> : null}
          </Card>
        </div>
      )}
    </Container>
  );
}
