import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readBoundedJsonBody } from "@/lib/request/bounded-json-body";
import { requireAdminApi } from "@/features/admin/services/admin";
import { requireAdminStepUpApi } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { createAdminClient, supabaseServerAdminRequest } from "@/lib/supabase/server";
import { verifyGeneratedCloudinaryVideo, deleteVerifiedGeneratedCloudinaryVideo } from "@/features/videos/services/generated-cloudinary-asset";
import { getConfirmedYoutubeFallbackId, shouldKeepPublishedVideoAfterMediaPurge, wasPublishedBeforeMediaPurge } from "@/features/videos/services/video-media-contract";
import { resolveVideoRequestAudience } from "@/features/videos/services/video-audience-visibility";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const VIDEO_REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RequestRow = {
  id: string;
  status: string;
  video_url: string | null;
  content: unknown;
  updated_at: string;
};

type QueueRow = {
  id: string;
  content_id: string;
  status: string;
  video_url: string | null;
  metadata: Record<string, unknown> | null;
  updated_at?: string;
};

type CatalogRow = {
  id: string;
  slug?: string | null;
  metadata: Record<string, unknown> | null;
  published: boolean | null;
  youtube_id: string | null;
  updated_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getProjectDeletion(value: unknown): Record<string, unknown> {
  return asRecord(asRecord(value).projectMediaDeletion);
}

function getStorageRetention(value: unknown): Record<string, unknown> {
  return asRecord(asRecord(value).storageRetention);
}

function catalogReferencesTargetedMedia(
  catalog: CatalogRow,
  assetUrl: string | null,
  storagePaths: string[],
): boolean {
  const metadata = asRecord(catalog.metadata);
  const deletion = getProjectDeletion(metadata);
  const mediaUrls = [
    metadata.generatedVideoUrl,
    metadata.videoUrl,
    metadata.video_url,
    metadata.sourceVideoUrl,
  ];
  const referencesCloudinary = Boolean(assetUrl) &&
    (mediaUrls.includes(assetUrl) || deletion.assetUrl === assetUrl);
  const hasOtherLiveMediaPointer = mediaUrls.some((value) =>
    typeof value === "string" && value.trim().length > 0 &&
    value !== assetUrl && !isTargetedStorageUrl(value, storagePaths)
  );
  const markerPaths = Array.isArray(deletion.storagePaths)
    ? deletion.storagePaths.map((value) => managedVideoStoragePath({ bucket: "videos", path: value })).filter(Boolean)
    : [];
  const referencesStorage = mediaUrls.some((value) => isTargetedStorageUrl(value, storagePaths)) ||
    (!hasOtherLiveMediaPointer && markerPaths.some((path) => typeof path === "string" && storagePaths.includes(path)));
  return referencesCloudinary || referencesStorage;
}

function managedVideoStoragePath(value: unknown): string | null {
  const retention = asRecord(value);
  if (retention.bucket !== "videos" || typeof retention.path !== "string") return null;
  const path = retention.path.trim();
  const segments = path.split("/");
  if (
    !path.startsWith("automated/") ||
    !path.toLowerCase().endsWith(".mp4") ||
    segments.length < 2 ||
    segments.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
  ) return null;
  return path;
}

function isConfiguredSupabaseOrigin(value: string): boolean {
  try {
    const candidate = new URL(value);
    const configured = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!configured) return false;
    const base = new URL(configured);
    return candidate.protocol === "https:" &&
      candidate.origin === base.origin &&
      !candidate.username &&
      !candidate.password;
  } catch {
    return false;
  }
}

function managedVideoStoragePathFromUrl(value: unknown): string | null {
  if (typeof value !== "string" || !isConfiguredSupabaseOrigin(value)) return null;
  const url = new URL(value);
  const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/videos\/(.+)$/i);
  if (!match) return null;
  let path: string;
  try {
    path = match[1].split("/").map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return null;
  }
  return managedVideoStoragePath({ bucket: "videos", path });
}

function isTargetedStorageUrl(value: unknown, storagePaths: string[]): boolean {
  const path = managedVideoStoragePathFromUrl(value);
  return path !== null && storagePaths.includes(path);
}

function clearExactVideoAliases(contentValue: unknown, videoUrl: string): Record<string, unknown> {
  const content = { ...asRecord(contentValue) };
  for (const key of ["videoUrl", "generatedVideoUrl", "video_url"]) {
    if (content[key] === videoUrl) delete content[key];
  }
  return content;
}

function requestContentForDeletion(
  row: RequestRow,
  videoUrl: string | null,
  storagePaths: string[],
  linkedRequestIds: string[],
  requestedAt: string,
  requestedBy: string,
): Record<string, unknown> {
  const content = videoUrl ? clearExactVideoAliases(row.content, videoUrl) : { ...asRecord(row.content) };
  const previousRetention = getStorageRetention(content);
  return {
    ...content,
    ...(storagePaths.length && previousRetention.bucket === "videos"
      ? { storageRetention: { ...previousRetention, state: "purge_pending", ownerRequested: true, requestedAt } }
      : {}),
    projectMediaDeletion: {
      state: "purging",
      ...(videoUrl ? { assetUrl: videoUrl } : {}),
      storagePaths,
      linkedRequestIds,
      requestedAt,
      requestedBy,
    },
  };
}

function queueMetadataForDeletion(
  row: QueueRow,
  videoUrl: string | null,
  storagePaths: string[],
  linkedRequestIds: string[],
  requestedAt: string,
  requestedBy: string,
): Record<string, unknown> {
  const metadata = { ...asRecord(row.metadata) };
  const previousRetention = getStorageRetention(metadata);
  return {
    ...metadata,
    ...(storagePaths.length && previousRetention.bucket === "videos"
      ? { storageRetention: { ...previousRetention, state: "purge_pending", ownerRequested: true, requestedAt } }
      : {}),
    projectMediaDeletion: {
      state: "purging",
      ...(videoUrl ? { assetUrl: videoUrl } : {}),
      storagePaths,
      linkedRequestIds,
      requestedAt,
      requestedBy,
    },
  };
}

function finalizeDeletionRecord<T extends Record<string, unknown>>(value: T, key: "content" | "metadata"): T {
  const source = asRecord(value[key]);
  const deletion = asRecord(source.projectMediaDeletion);
  return {
    ...value,
    [key]: {
      ...source,
      projectMediaDeletion: {
        state: "purged",
        ...(typeof deletion.requestedAt === "string" ? { requestedAt: deletion.requestedAt } : {}),
        ...(typeof deletion.requestedBy === "string" ? { requestedBy: deletion.requestedBy } : {}),
        deletedAt: new Date().toISOString(),
      },
      ...(asRecord(source.storageRetention).ownerRequested === true
        ? {
            storageRetention: {
              ...asRecord(source.storageRetention),
              state: "purged",
              purgedAt: new Date().toISOString(),
            },
          }
        : {}),
    },
  };
}

function storagePathsFromRows(
  requests: RequestRow[],
  queues: QueueRow[],
  assetUrl: string | null,
  primaryRequestId: string,
): string[] {
  const paths = new Set<string>();
  const targetRequestIds = new Set<string>();
  for (const row of requests) {
    const content = asRecord(row.content);
    const deletion = getProjectDeletion(content);
    const aliases = [content.generatedVideoUrl, content.videoUrl, content.video_url];
    const matchesTarget = assetUrl !== null
      ? row.video_url === assetUrl || aliases.includes(assetUrl) || deletion.assetUrl === assetUrl
      : row.id === primaryRequestId;
    if (!matchesTarget) continue;
    targetRequestIds.add(row.id);
    const path = managedVideoStoragePath(getStorageRetention(content));
    if (path) paths.add(path);
    const markerPaths = deletion.storagePaths;
    if (Array.isArray(markerPaths)) {
      for (const candidate of markerPaths) {
        const safe = managedVideoStoragePath({ bucket: "videos", path: candidate });
        if (safe) paths.add(safe);
      }
    }
  }

  for (const row of queues) {
    const metadata = asRecord(row.metadata);
    const deletion = getProjectDeletion(metadata);
    const queueMatchesTarget = assetUrl !== null &&
      (row.video_url === assetUrl || deletion.assetUrl === assetUrl);
    const deletionLinkedToTargetRequest = Array.isArray(deletion.linkedRequestIds) &&
      deletion.linkedRequestIds.some((value) => typeof value === "string" && targetRequestIds.has(value));
    const sameRequestStagingCopy = targetRequestIds.has(row.content_id) && row.video_url === null;
    if (!queueMatchesTarget && !deletionLinkedToTargetRequest && !sameRequestStagingCopy) continue;

    const path = managedVideoStoragePath(getStorageRetention(metadata));
    if (path) paths.add(path);
    const markerPaths = deletion.storagePaths;
    if (Array.isArray(markerPaths)) {
      for (const candidate of markerPaths) {
        const safe = managedVideoStoragePath({ bucket: "videos", path: candidate });
        if (safe) paths.add(safe);
      }
    }
  }
  return [...paths];
}

async function loadRequestsForAsset(videoUrl: string): Promise<RequestRow[]> {
  const rows: RequestRow[] = [];
  const encodedUrl = encodeURIComponent(videoUrl);
  for (let offset = 0; offset <= 5000; offset += 500) {
    const page = await supabaseServerAdminRequest<RequestRow[]>(
      `/rest/v1/video_generation_requests?video_url=eq.${encodedUrl}&select=id,status,video_url,content,updated_at&order=id.asc&limit=500&offset=${offset}`,
    );
    if (!Array.isArray(page)) throw new Error("VIDEO_PROJECT_DELETE_REQUEST_INVENTORY_INVALID");
    rows.push(...page);
    if (page.length < 500) return rows;
  }
  throw new Error("VIDEO_PROJECT_DELETE_REQUEST_INVENTORY_LIMIT");
}

async function loadRequestsByIds(requestIds: string[]): Promise<RequestRow[]> {
  const ids = [...new Set(requestIds)].filter((id) => VIDEO_REQUEST_ID_PATTERN.test(id));
  if (!ids.length) return [];
  const filter = ids.length === 1 ? `eq.${ids[0]}` : `in.(${ids.join(",")})`;
  const rows = await supabaseServerAdminRequest<RequestRow[]>(
    `/rest/v1/video_generation_requests?id=${filter}&select=id,status,video_url,content,updated_at&order=id.asc&limit=1000`,
  );
  if (!Array.isArray(rows) || rows.length >= 1000) {
    throw new Error("VIDEO_PROJECT_DELETE_REQUEST_INVENTORY_INVALID");
  }
  return rows;
}

async function loadQueuesForRequests(requestIds: string[]): Promise<QueueRow[]> {
  if (!requestIds.length) return [];
  const ids = requestIds.map((id) => id.replace(/[^0-9a-f-]/gi, ""));
  const filter = ids.length === 1 ? `eq.${ids[0]}` : `in.(${ids.join(",")})`;
  const rows = await supabaseServerAdminRequest<QueueRow[]>(
    `/rest/v1/social_publish_queue?content_id=${filter}&select=id,content_id,status,video_url,metadata,updated_at&order=id.asc&limit=1000`,
  );
  if (!Array.isArray(rows) || rows.length >= 1000) {
    throw new Error("VIDEO_PROJECT_DELETE_SOCIAL_QUEUE_INVENTORY_INVALID");
  }
  return rows;
}

async function loadCatalogForRequest(requestId: string): Promise<CatalogRow[]> {
  const [byMetadata, bySlug] = await Promise.all([
    supabaseServerAdminRequest<CatalogRow[]>(
      `/rest/v1/videos?metadata->>videoGenerationRequestId=eq.${encodeURIComponent(requestId)}&select=id,slug,metadata,published,youtube_id,updated_at&limit=10`,
    ),
    supabaseServerAdminRequest<CatalogRow[]>(
      `/rest/v1/videos?slug=eq.${encodeURIComponent("zikr-" + requestId)}&select=id,slug,metadata,published,youtube_id,updated_at&limit=10`,
    ),
  ]);
  if (!Array.isArray(byMetadata) || !Array.isArray(bySlug) || byMetadata.length >= 10 || bySlug.length >= 10) {
    throw new Error("VIDEO_PROJECT_DELETE_CATALOG_INVENTORY_INVALID");
  }
  const unique = new Map<string, CatalogRow>();
  for (const row of [...byMetadata, ...bySlug]) {
    if (row && typeof row.id === "string") unique.set(row.id, row);
  }
  return [...unique.values()];
}

async function patchRow<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T[]> {
  const rows = await supabaseServerAdminRequest<T[]>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!Array.isArray(rows)) throw new Error("VIDEO_PROJECT_DELETE_DATABASE_MUTATION_INVALID");
  return rows;
}

async function removeStorageObjects(paths: string[]): Promise<number> {
  if (!paths.length) return 0;
  const bucket = createAdminClient().storage.from("videos");
  let removed = 0;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { data, error } = await bucket.remove(paths.slice(offset, offset + 100));
    if (error) throw new Error("VIDEO_PROJECT_DELETE_SUPABASE_STORAGE_FAILED: " + error.message);
    removed += data?.length ?? Math.min(100, paths.length - offset);
  }
  return removed;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let deletionStarted = false;
  const auth = await requireAdminStepUpApi("video.delete", "/admin/video/requests");
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.error, nextPath: "nextPath" in auth ? auth.nextPath : undefined },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { id } = await context.params;
    if (!VIDEO_REQUEST_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: "معرّف طلب الفيديو غير صالح." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const parsed = await readBoundedJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers: { "Cache-Control": "no-store" } });
    const body = parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)
      ? parsed.value as Record<string, unknown>
      : {};
    if (body.confirmed !== true || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
      return NextResponse.json({ error: "يلزم تأكيد حذف نسخة المشروع وتحديث القائمة قبل التنفيذ." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const currentRows = await supabaseServerAdminRequest<RequestRow[]>(
      `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(id)}&select=id,status,video_url,content,updated_at&limit=1`,
    );
    const current = currentRows?.[0];
    if (!current) return NextResponse.json({ error: "طلب الفيديو غير موجود." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (current.updated_at !== body.expectedUpdatedAt) {
      return NextResponse.json({ error: "تغير سجل الفيديو؛ حدّث القائمة ثم أعد طلب الحذف." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const currentDeletion = getProjectDeletion(current.content);
    const pendingUrl = typeof currentDeletion.assetUrl === "string" ? currentDeletion.assetUrl : null;
    const currentContent = asRecord(current.content);
    const contentUrl = [currentContent.generatedVideoUrl, currentContent.videoUrl, currentContent.video_url]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
    const assetUrl = current.video_url || pendingUrl || contentUrl;
    const currentRetention = getStorageRetention(current.content);
    const targetStoragePath = currentRetention.state === "purged" ? null : managedVideoStoragePath(currentRetention);
    if (!assetUrl && !targetStoragePath && currentDeletion.state !== "purging") {
      return NextResponse.json({ error: "لا توجد نسخة فيديو أو عملية تنظيف معلقة لهذا الطلب." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const audience = resolveVideoRequestAudience(current.content);
    if (!audience.ok) {
      return NextResponse.json({ error: "بيانات جمهور الفيديو غير صالحة؛ لم يتم حذف أي ملف." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    if (audience.audience === "kids") {
      const kidsAuth = await requireAdminApi("kids.manage");
      if (!kidsAuth.ok || kidsAuth.profile.id !== auth.profile.id) {
        return NextResponse.json(
          { error: kidsAuth.ok ? "Unauthorized" : kidsAuth.error },
          { status: kidsAuth.ok ? 401 : kidsAuth.status, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const isSupabaseStorageAsset = assetUrl ? isConfiguredSupabaseOrigin(assetUrl) : false;
    const urlStoragePath = assetUrl ? managedVideoStoragePathFromUrl(assetUrl) : null;
    if (isSupabaseStorageAsset && !urlStoragePath) {
      return NextResponse.json({ error: "رابط Supabase لا يشير إلى MP4 مولّد داخل videos/automated؛ لم يتم حذف أي ملف." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    let verifiedAsset: Awaited<ReturnType<typeof verifyGeneratedCloudinaryVideo>> | null = null;
    if (assetUrl && !isSupabaseStorageAsset) {
      verifiedAsset = await verifyGeneratedCloudinaryVideo(assetUrl, process.env, fetch, { allowProjectReference: true });
    }

    const assetLinkedRequests = assetUrl ? await loadRequestsForAsset(assetUrl) : [];
    const priorLinkedIds = Array.isArray(currentDeletion.linkedRequestIds)
      ? currentDeletion.linkedRequestIds.filter((value): value is string => typeof value === "string" && VIDEO_REQUEST_ID_PATTERN.test(value))
      : [];
    const allKnownRequestIds = [...new Set([current.id, ...assetLinkedRequests.map((row) => row.id), ...priorLinkedIds])];
    const byId = new Map<string, RequestRow>();
    for (const row of [...assetLinkedRequests, ...(priorLinkedIds.length ? await loadRequestsByIds(priorLinkedIds) : []), current]) byId.set(row.id, row);
    const linkedRequests = [...byId.values()];
    const requestIds = allKnownRequestIds;
    const queueRows = await loadQueuesForRequests(requestIds);
    const knownStoragePaths = storagePathsFromRows(linkedRequests, queueRows, assetUrl, current.id);
    const storagePaths = [...new Set([...knownStoragePaths, ...(urlStoragePath ? [urlStoragePath] : [])])];
    const requestedAt = new Date().toISOString();
    const requestedBy = auth.profile.id;

    // Clear project playback pointers first. The request, source, approval history,
    // and platform IDs remain; only the owner's internal video copy is detached.
    const updatedRequests: RequestRow[] = [];
    for (const row of linkedRequests) {
      const content = requestContentForDeletion(row, assetUrl, storagePaths, requestIds, requestedAt, requestedBy);
      const rowDeletion = getProjectDeletion(row.content);
      const rowStoragePath = managedVideoStoragePath(getStorageRetention(row.content));
      const matchesVideoAsset = assetUrl !== null &&
        (row.video_url === assetUrl ||
          [asRecord(row.content).generatedVideoUrl, asRecord(row.content).videoUrl, asRecord(row.content).video_url].includes(assetUrl));
      const matchesStorageCopy = rowStoragePath !== null && storagePaths.includes(rowStoragePath);
      const nextStatus = (matchesVideoAsset || matchesStorageCopy) &&
        ["pending", "processing", "retry_wait"].includes(row.status)
        ? "cancelled"
        : row.status;
      const filter = `id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(row.updated_at)}`;
      const updated = await patchRow<RequestRow>(
        `/rest/v1/video_generation_requests?${filter}&select=id,status,video_url,content,updated_at`,
        { video_url: row.video_url === assetUrl && assetUrl !== null ? null : row.video_url, status: nextStatus, content, updated_at: requestedAt },
      );
      if (updated.length !== 1) throw new Error("VIDEO_PROJECT_DELETE_REQUEST_CONFLICT");
      deletionStarted = true;
      updatedRequests.push(updated[0]);
    }

    const updatedQueues: QueueRow[] = [];
    for (const row of queueRows) {
      const pendingQueueDeletion = getProjectDeletion(row.metadata);
      const queueStoragePath = managedVideoStoragePath(getStorageRetention(row.metadata));
      const matchesVideoAsset = assetUrl !== null && (row.video_url === assetUrl || pendingQueueDeletion.assetUrl === assetUrl);
      const matchesStorageCopy = queueStoragePath !== null && storagePaths.includes(queueStoragePath);
      if (!matchesVideoAsset && !matchesStorageCopy) continue;
      const relatedVideoUrl = matchesVideoAsset && assetUrl !== null && row.video_url === assetUrl ? assetUrl : null;
      const metadata = queueMetadataForDeletion(row, relatedVideoUrl, storagePaths, requestIds, requestedAt, requestedBy);
      const nextStatus = row.status === "published"
        ? "published"
        : row.video_url === assetUrl && assetUrl !== null && ["queued", "processing", "retry_wait", "pending", "scheduled"].includes(row.status)
          ? "failed"
          : row.status;
      const queueFilter = `id=eq.${encodeURIComponent(row.id)}${row.updated_at ? `&updated_at=eq.${encodeURIComponent(row.updated_at)}` : ""}`;
      const updated = await patchRow<QueueRow>(
        `/rest/v1/social_publish_queue?${queueFilter}&select=id,content_id,status,video_url,metadata,updated_at`,
        { video_url: matchesVideoAsset && assetUrl !== null && row.video_url === assetUrl ? null : row.video_url, status: nextStatus, metadata, updated_at: requestedAt },
      );
      if (updated.length !== 1) throw new Error("VIDEO_PROJECT_DELETE_SOCIAL_QUEUE_CONFLICT");
      deletionStarted = true;
      updatedQueues.push(updated[0]);
    }

    const updatedCatalog: CatalogRow[] = [];
    for (const requestRow of linkedRequests) {
      const catalogRows = await loadCatalogForRequest(requestRow.id);
      for (const catalog of catalogRows) {
        if (!catalogReferencesTargetedMedia(catalog, assetUrl, storagePaths)) continue;
        const previousMetadata = asRecord(catalog.metadata);
        const fallbackId = getConfirmedYoutubeFallbackId(catalog);
        const keepPublishedFallback = shouldKeepPublishedVideoAfterMediaPurge(catalog, true);
        const clearedMediaMetadata = { ...previousMetadata };
        for (const key of ["generatedVideoUrl", "videoUrl", "video_url", "sourceVideoUrl"] as const) {
          const value = previousMetadata[key];
          if ((assetUrl !== null && value === assetUrl) || isTargetedStorageUrl(value, storagePaths)) {
            clearedMediaMetadata[key] = null;
          }
        }
        const metadata = {
          ...clearedMediaMetadata,
          mediaState: "purged",
          mediaFallbackAvailable: fallbackId !== null,
          mediaPurgedFromPublished: wasPublishedBeforeMediaPurge(catalog),
          mediaPurgedAt: requestedAt,
          projectMediaDeletion: {
            state: "purging",
            ...(assetUrl ? { assetUrl } : {}),
            storagePaths,
            requestedAt,
            requestedBy,
          },
        };
        const catalogFilter = `id=eq.${encodeURIComponent(catalog.id)}&updated_at=eq.${encodeURIComponent(catalog.updated_at)}`;
        const updated = await patchRow<CatalogRow>(
          `/rest/v1/videos?${catalogFilter}&select=id,slug,metadata,published,youtube_id,updated_at`,
          {
            published: keepPublishedFallback,
            ...(keepPublishedFallback && fallbackId ? { youtube_id: fallbackId } : {}),
            metadata,
            updated_at: requestedAt,
          },
        );
        if (updated.length !== 1) throw new Error("VIDEO_PROJECT_DELETE_CATALOG_CONFLICT");
        deletionStarted = true;
        updatedCatalog.push(updated[0]);
      }
    }

    let storageObjectsDeleted = 0;
    let cloudinaryCleanupPending = false;
    let storageCleanupPending = false;
    try {
      storageObjectsDeleted = await removeStorageObjects(storagePaths);
    } catch (error) {
      storageCleanupPending = true;
      console.error("[api/admin/videos/[id]/project-copy] Supabase Storage cleanup pending:", error);
    }

    if (verifiedAsset) {
      try {
        await deleteVerifiedGeneratedCloudinaryVideo(verifiedAsset);
      } catch (error) {
        cloudinaryCleanupPending = true;
        console.error("[api/admin/videos/[id]/project-copy] Cloudinary cleanup pending:", {
          requestId: id,
          publicId: verifiedAsset.publicId,
          error,
        });
      }
    }

    const cleanupPending = cloudinaryCleanupPending || storageCleanupPending;
    if (!cleanupPending) {
      for (const row of updatedRequests) {
        const finalized = finalizeDeletionRecord(row as unknown as Record<string, unknown>, "content");
        const updated = await patchRow<RequestRow>(
          `/rest/v1/video_generation_requests?id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=id,status,video_url,content,updated_at`,
          { content: finalized.content, updated_at: new Date().toISOString() },
        );
        if (updated.length !== 1) {
          cloudinaryCleanupPending = true;
          console.error("[api/admin/videos/[id]/project-copy] request deletion marker finalization pending:", row.id);
        }
      }
      for (const row of updatedQueues) {
        const finalized = finalizeDeletionRecord(row as unknown as Record<string, unknown>, "metadata");
        const updated = await patchRow<QueueRow>(
          `/rest/v1/social_publish_queue?id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(row.updated_at ?? "")}&select=id,content_id,status,video_url,metadata,updated_at`,
          { metadata: finalized.metadata, updated_at: new Date().toISOString() },
        );
        if (updated.length !== 1) {
          cloudinaryCleanupPending = true;
          console.error("[api/admin/videos/[id]/project-copy] social queue deletion marker finalization pending:", row.id);
        }
      }
      for (const row of updatedCatalog) {
        const finalized = finalizeDeletionRecord(row as unknown as Record<string, unknown>, "metadata");
        const updated = await patchRow<CatalogRow>(
          `/rest/v1/videos?id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=id,slug,metadata,published,youtube_id,updated_at`,
          { metadata: finalized.metadata, updated_at: new Date().toISOString() },
        );
        if (updated.length !== 1) {
          cloudinaryCleanupPending = true;
          console.error("[api/admin/videos/[id]/project-copy] catalog deletion marker finalization pending:", row.id);
        }
      }
    }

    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
        action: "video.project_copy.delete",
        permission: "video.delete",
        resourceType: "video_generation_requests",
        resourceId: id,
        metadata: {
          projectAssetDeleted: !cloudinaryCleanupPending && !storageCleanupPending,
          cloudinaryPublicId: verifiedAsset?.publicId ?? null,
          cloudinaryCleanupPending,
          storageObjectsDeleted,
          storageCleanupPending,
          linkedRequestRowsUpdated: updatedRequests.length,
          socialQueueRowsPreserved: true,
          externalSocialPostsDeleted: false,
          platformPublicationIdsPreserved: true,
          catalogRowsUpdated: updatedCatalog.length,
        },
      }),
      (auditError) => console.error("[api/admin/videos/[id]/project-copy] audit event failed after media cleanup:", auditError),
    );

    for (const path of ["/admin/video/requests", "/admin/video/review", "/admin/videos", "/videos"]) revalidatePath(path);
    return NextResponse.json(
      {
        ok: true,
        projectCopyDeleted: !cloudinaryCleanupPending && !storageCleanupPending,
        cleanupPending: cloudinaryCleanupPending || storageCleanupPending,
        cloudinaryCleanupPending,
        storageCleanupPending,
        cloudinaryPublicId: verifiedAsset?.publicId ?? null,
        storageObjectsDeleted,
        linkedRequestRowsUpdated: updatedRequests.length,
        socialQueueRowsPreserved: true,
        platformPublicationIdsPreserved: true,
        externalSocialPostsDeleted: false,
        auditRecorded,
        message: cleanupPending
          ? "تم فصل نسخة المشروع عن الطابور والمكتبة. بقي تنظيف ملف تخزين واحد أو أكثر معلقًا ويمكن إعادة المحاولة من الطلب نفسه؛ لم تُحذف منشورات السوشيال."
          : "تم حذف نسخة المشروع من Cloudinary وSupabase Storage. بقيت سجلات المصدر والاعتماد ومعرفات YouTube وFacebook والمنشورات الخارجية دون حذف.",
      },
      { status: cleanupPending ? 202 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict = /_CONFLICT$/.test(message);
    const status = conflict ? 409 : 500;
    console.error("[api/admin/videos/[id]/project-copy] POST:", error);
    return NextResponse.json(
      {
        error: conflict
          ? "تغير سجل الفيديو أثناء العملية؛ لم يُحذف ملف Cloudinary. حدّث القائمة وأعد المحاولة، وسيستكمل النظام أي تنظيف معلّق."
          : message.startsWith("VIDEO_PROJECT_DELETE_")
            ? "تعذر إكمال فحص مراجع نسخة المشروع. لم يبدأ حذف ملف Cloudinary؛ أعد المحاولة بعد تحديث البيانات."
            : "تعذر حذف نسخة المشروع. لم يتم حذف أي منشور خارجي.",
        code: message,
        deletionStarted,
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
