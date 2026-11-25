import "server-only";

import { isSupabaseConfigured, supabaseServerAnonRequest } from "@/lib/supabase/server";

import type { VideoCategory, Video } from "@/features/videos/types/videos";
import { FALLBACK_VIDEO_CATEGORIES, FALLBACK_VIDEOS } from "@/features/videos/data/fallback";
import { defaultOgImage } from "@/lib/site";
import { supabaseServerAdminRequest } from "@/lib/supabase/admin-rest";
import { resolveKidsVideoSocialPublicationForDetail } from "@/features/social/services/kids-video-social-detail";
import { resolveVideoMediaUrl, resolveVideoThumbnail, resolveVideoYoutubeId } from "./video-media-contract";
import { isGeneralAudienceVideoMetadata } from "./video-audience-visibility";
import { isKidsVideoGenerationRequestContent } from "@/features/kids/services/kids-video-request-visibility";
import {
  buildVideoApprovalSnapshotHashForRequest,
  isAutomatedKidsVideoApprovalRecorded,
  resolveKidsVideoQaStatusForApproval,
  type VideoPublishRequestSnapshot,
} from "./video-publish-approval";

function isPubliclyRenderableVideo(row: Record<string, unknown>): boolean {
  return Boolean(resolveVideoMediaUrl(row));
}

// Videos
export async function getVideoCategories(): Promise<VideoCategory[]> {
  if (!isSupabaseConfigured()) return FALLBACK_VIDEO_CATEGORIES;
  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    "/rest/v1/video_categories?select=id,name_ar,name_en,slug,icon&published=eq.true&slug=neq.kids-stories&order=name_ar.asc"
  ).catch(error => {
    console.error("[content] Failed to fetch video categories:", error);
    return [];
  });

  if (rows.length === 0) return FALLBACK_VIDEO_CATEGORIES;

  return rows.map(r => ({
    id: r.id as string,
    nameAr: r.name_ar as string,
    nameEn: r.name_en as string,
    slug: r.slug as string,
    icon: r.icon as string | undefined,
  }));
}

export async function getVideos(
  categoryId?: string,
  limit = 20
): Promise<Video[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const fallback = categoryId && categoryId !== "all"
    ? FALLBACK_VIDEOS.filter((video) => video.categoryId === categoryId)
    : FALLBACK_VIDEOS;

  if (!isSupabaseConfigured()) return fallback.slice(0, safeLimit);
  // Start with general-audience rows. Kids-directed stories are added only
  // through the separate strict source-fingerprint and automated-QA path below,
  // so approved stories can be public without weakening the Kids review gate.
  let query =
    "/rest/v1/videos?select=id,title,slug,description,youtube_id,thumbnail_url,duration,views,published,category_id,metadata,created_at&published=eq.true&or=(metadata->>audience.is.null,metadata->>audience.eq.general)&order=created_at.desc";

  if (categoryId && categoryId !== "all") {
    query += `&category_id=eq.${encodeURIComponent(categoryId)}`;
  }

  query += `&limit=${Math.min(100, safeLimit * 2)}`;

  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    query
  ).catch(error => {
    console.error("[content] Failed to fetch videos:", error);
    return [];
  });

  const renderableRows = rows.filter((row) => isGeneralAudienceVideoMetadata(row.metadata) && isPubliclyRenderableVideo(row));
  const generalVideos: Video[] = renderableRows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    description: r.description as string | undefined,
    youtubeId: resolveVideoYoutubeId(r) ?? undefined,
    thumbnailUrl: resolveVideoThumbnail(r, defaultOgImage),
    duration: (r.duration as number) || undefined,
    views: (r.views as number) || 0,
    published: r.published as boolean,
    categoryId: r.category_id as string | undefined,
    metadata: r.metadata as Record<string, unknown> | undefined,
    createdAt: r.created_at as string,
  }));

  // Reuse the Kids feed's strict request-fingerprint + automated-QA validation.
  // A story that passes it is cross-listed in the public video library as well;
  // it is not hidden from general visitors or confined to /kids.
  const kidsVideos = await getKidsGeneratedVideos(safeLimit).catch((error) => {
    console.warn("[content] Could not cross-list Kids-suitable videos in the public library:", error);
    return [] as Video[];
  });
  const combined = new Map<string, Video>();
  for (const video of [...generalVideos, ...kidsVideos]) {
    if (categoryId && categoryId !== "all" && video.categoryId !== categoryId) continue;
    combined.set(video.id, video);
  }

  const publicVideos = [...combined.values()]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, safeLimit);
  return publicVideos.length > 0 ? publicVideos : fallback.slice(0, safeLimit);
}

export async function getVideoBySlug(slug: string): Promise<Video | null> {
  const safeSlug = encodeURIComponent(slug?.trim() ?? '');
  if (!safeSlug) return null;
  if (!isSupabaseConfigured()) return FALLBACK_VIDEOS.find((video) => video.slug === slug.trim()) ?? null;

  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    `/rest/v1/videos?select=*&slug=eq.${safeSlug}&published=eq.true&or=(metadata->>audience.is.null,metadata->>audience.eq.general)&limit=1`,
    { timeoutMs: 8000, retries: 1, cache: "no-store" },
  ).catch(error => {
    console.error("[content] Failed to fetch video by slug:", error);
    return [];
  });

  if (!rows.length) {
    const kidsSuitableVideo = await getKidsGeneratedVideoBySlug(slug).catch((error) => {
      console.warn("[content] Could not load a Kids-suitable video through the public detail route:", error);
      return null;
    });
    return kidsSuitableVideo ?? FALLBACK_VIDEOS.find((video) => video.slug === slug.trim()) ?? null;
  }
  if (!isGeneralAudienceVideoMetadata(rows[0].metadata)) return null;
  if (!isPubliclyRenderableVideo(rows[0])) {
    return FALLBACK_VIDEOS.find((video) => video.slug === slug.trim()) ?? null;
  }
  const r = rows[0];

  return {
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    description: r.description as string | undefined,
    youtubeId: resolveVideoYoutubeId(r) ?? undefined,
    thumbnailUrl: resolveVideoThumbnail(r, defaultOgImage),
    duration: (r.duration as number) || undefined,
    views: (r.views as number) || 0,
    published: r.published as boolean,
    categoryId: r.category_id as string | undefined,
    metadata: r.metadata as Record<string, unknown> | undefined,
    createdAt: r.created_at as string,
  };
}


function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

type KidsVideoApprovalRequest = VideoPublishRequestSnapshot & { id: string };

function isValidVideoRequestId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function hasPassedKidsVideoQa(metadata: Record<string, unknown>): boolean {
  const qa = asRecord(metadata.automatedVideoQa);
  return metadata.audience === "kids" &&
    metadata.kidsVideoQaStatus === "passed" &&
    qa.status === "passed";
}

function hasCurrentAutomatedKidsVideoApproval(
  metadata: Record<string, unknown>,
  request: KidsVideoApprovalRequest,
): boolean {
  const requestContent = asRecord(request.content);
  const snapshotHash = buildVideoApprovalSnapshotHashForRequest(request);
  if (!snapshotHash || !isKidsVideoGenerationRequestContent(requestContent)) return false;
  if (!isAutomatedKidsVideoApprovalRecorded(requestContent, snapshotHash) ||
      !isAutomatedKidsVideoApprovalRecorded(metadata, snapshotHash)) return false;
  if (
    metadata.videoGenerationRequestId !== request.id ||
    metadata.approvalSnapshotHash !== snapshotHash ||
    metadata.approvalReviewerId !== requestContent.approvalReviewerId ||
    metadata.approvalReviewedAt !== requestContent.approvalReviewedAt
  ) return false;
  return resolveKidsVideoQaStatusForApproval({
    requestContent,
    catalogMetadata: metadata,
    requestId: request.id,
    videoUrl: request.video_url ?? "",
    sourceHash: request.source_hash,
    contentHash: request.content_hash,
    templateVersion: request.template_version,
  }) === "passed";
}

async function loadApprovedKidsVideoRequests(
  requestIds: string[],
): Promise<Map<string, KidsVideoApprovalRequest>> {
  const uniqueIds = [...new Set(requestIds.filter(isValidVideoRequestId))];
  if (uniqueIds.length === 0) return new Map();
  const filter = uniqueIds.map(encodeURIComponent).join(",");
  const requests = await supabaseServerAdminRequest<KidsVideoApprovalRequest[]>(
    "/rest/v1/video_generation_requests?id=in.(" + filter + ")&status=eq.completed&select=id,status,category,video_url,source_hash,content_hash,template_version,content",
    { timeoutMs: 8000, retries: 1, cache: "no-store" },
  );
  if (!Array.isArray(requests)) {
    throw new Error("Kids video approval request query returned an invalid row set.");
  }
  const approved = new Map<string, KidsVideoApprovalRequest>();
  for (const request of requests) {
    const content = asRecord(request.content);
    const snapshotHash = buildVideoApprovalSnapshotHashForRequest(request);
    if (!snapshotHash ||
        !isKidsVideoGenerationRequestContent(content) ||
        !isAutomatedKidsVideoApprovalRecorded(content, snapshotHash)) continue;
    approved.set(request.id, request);
  }
  return approved;
}

export async function getKidsGeneratedVideos(limit = 60): Promise<Video[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured; Kids generated videos are unavailable.");
  }

  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    "/rest/v1/videos?select=id,title,slug,description,youtube_id,thumbnail_url,duration,views,published,category_id,metadata,created_at&published=eq.true&metadata->>audience=eq.kids&metadata->>generator=eq.zikr_internal_video_factory&metadata->>kidsVideoQaStatus=eq.passed&metadata->automatedVideoQa->>status=eq.passed&metadata->>approvalStatus=eq.approved&metadata->>approvalReviewerId=not.is.null&metadata->>approvalReviewedAt=not.is.null&metadata->>approvalSnapshotHash=not.is.null&metadata->qualityReview->>mode=eq.automated&order=created_at.desc&limit=" + safeLimit,
    { cache: "no-store" },
  );
  if (!Array.isArray(rows)) {
    throw new Error("Kids generated video query returned an invalid row set.");
  }

  const requestIds = rows.map((row) => asRecord(row.metadata).videoGenerationRequestId)
    .filter((value): value is string => isValidVideoRequestId(value));
  const approvedRequests = await loadApprovedKidsVideoRequests(requestIds);

  return rows
    .filter((row) => {
      const metadata = asRecord(row.metadata);
      const requestId = metadata.videoGenerationRequestId;
      const request = typeof requestId === "string" ? approvedRequests.get(requestId) : undefined;
      return hasPassedKidsVideoQa(metadata) &&
        metadata.generator === "zikr_internal_video_factory" &&
        Boolean(request && hasCurrentAutomatedKidsVideoApproval(metadata, request)) &&
        isPubliclyRenderableVideo(row);
    })
    .slice(0, safeLimit)
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      description: row.description as string | undefined,
      youtubeId: resolveVideoYoutubeId(row) ?? undefined,
      thumbnailUrl: resolveVideoThumbnail(row, defaultOgImage),
      duration: (row.duration as number) || undefined,
      views: (row.views as number) || 0,
      published: row.published as boolean,
      categoryId: row.category_id as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.created_at as string,
    }));
}

export async function getKidsGeneratedVideoBySlug(slug: string): Promise<Video | null> {
  const safeSlug = encodeURIComponent(slug?.trim() ?? "");
  if (!safeSlug) return null;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured; Kids generated video details are unavailable.");
  }
  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    "/rest/v1/videos?select=id,title,slug,description,youtube_id,thumbnail_url,duration,views,published,category_id,metadata,created_at&slug=eq." +
      safeSlug + "&published=eq.true&metadata->>audience=eq.kids&metadata->>generator=eq.zikr_internal_video_factory&metadata->>kidsVideoQaStatus=eq.passed&metadata->automatedVideoQa->>status=eq.passed&metadata->>approvalStatus=eq.approved&metadata->>approvalReviewerId=not.is.null&metadata->>approvalReviewedAt=not.is.null&metadata->>approvalSnapshotHash=not.is.null&metadata->qualityReview->>mode=eq.automated&limit=1",
    { timeoutMs: 8000, retries: 1, cache: "no-store" },
  );
  if (!Array.isArray(rows)) {
    throw new Error("Kids generated video detail query returned an invalid row set.");
  }
  const row = rows[0];
  const metadata = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};
  if (!row || !hasPassedKidsVideoQa(metadata) ||
      metadata.generator !== "zikr_internal_video_factory" ||
      !isPubliclyRenderableVideo(row) ||
      !isValidVideoRequestId(metadata.videoGenerationRequestId)) return null;
  const approvedRequests = await loadApprovedKidsVideoRequests([metadata.videoGenerationRequestId]);
  const approvalRequest = approvedRequests.get(metadata.videoGenerationRequestId);
  if (!approvalRequest || !hasCurrentAutomatedKidsVideoApproval(metadata, approvalRequest)) return null;
  const socialPublicationResolution = await resolveKidsVideoSocialPublicationForDetail(
    metadata.videoGenerationRequestId,
    metadata.socialPublication,
    <T>(path: string) =>
      supabaseServerAdminRequest<T>(path, { timeoutMs: 8000, retries: 1, cache: "no-store" }),
  );
  if (socialPublicationResolution.status === "unavailable") {
    console.warn("[content] Kids video social publication state is unavailable:", socialPublicationResolution.reason);
  }
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string | undefined,
    youtubeId: resolveVideoYoutubeId(row) ?? undefined,
    thumbnailUrl: resolveVideoThumbnail(row, defaultOgImage),
    duration: (row.duration as number) || undefined,
    views: (row.views as number) || 0,
    published: row.published as boolean,
    categoryId: row.category_id as string | undefined,
    metadata: { ...metadata, socialPublication: socialPublicationResolution.publication, socialPublicationReadStatus: socialPublicationResolution.status, socialPublicationCaption: socialPublicationResolution.caption },
    createdAt: row.created_at as string,
  };
}

export async function getInternalGeneratedVideos(limit = 24): Promise<Video[]> {
  const rows = await getVideos(undefined, Math.max(1, Math.min(100, Math.trunc(limit))));
  return rows.filter((video) => {
    const metadata = video.metadata ?? {};
    return metadata.generator === "zikr_internal_video_factory" &&
      (typeof metadata.generatedVideoUrl === "string" ||
        typeof metadata.sourceVideoUrl === "string" ||
        Boolean(video.youtubeId));
  });
}
