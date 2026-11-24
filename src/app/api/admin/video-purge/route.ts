import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { readBoundedJsonBody } from "@/lib/request/bounded-json-body";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/services/admin";
import { requireAdminStepUpApi } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { createAdminClient, supabaseServerAdminRequest } from "@/lib/supabase/server";
import { getConfirmedYoutubeFallbackId, shouldKeepPublishedVideoAfterMediaPurge, wasPublishedBeforeMediaPurge } from "@/features/videos/services/video-media-contract";
import { isGeneratedCloudinaryVideoUrl } from "@/features/videos/services/video-media-url";
import { isVideoAutomationEnabled } from "@/features/videos/services/background-job-settings";
import { findGeneratedVideoReferences, findUnmanagedGeneratedVideoReferences } from "@/features/videos/services/video-media-reference-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CONFIRMATION_PHRASE = "امسح الفيديوهات المولّدة فقط";
const MAX_AUTOMATED_STORAGE_OBJECTS = 5000;


type CloudinaryAsset = {
  asset_id?: string;
  public_id?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  bytes?: number;
  tags?: string[];
};

type CloudinarySearchPage = {
  resources?: CloudinaryAsset[];
  next_cursor?: string;
  total_count?: number;
};

function collectGeneratedVideoCandidateValues(...sources: unknown[]): string[] {
  const candidates = new Set<string>();
  const addText = (value: string) => {
    const text = value.trim();
    if (!text) return;
    for (const match of text.matchAll(/auto-[A-Za-z0-9_-]+/g)) candidates.add(match[0]);
    for (const match of text.matchAll(/automated\/[A-Za-z0-9_./-]+/g)) {
      const path = match[0].split(/[?#"'\s]/)[0];
      if (path && !path.split("/").some(part => part === "." || part === "..")) candidates.add(path.replace(/\/$/, ""));
    }
    try {
      const parsed = new URL(text);
      const segments = parsed.pathname.split("/").filter(Boolean);
      const storageMarker = segments.findIndex((segment, index) => segment === "videos" && segments[index - 1] === "public");
      if (storageMarker >= 0 && segments[storageMarker + 1] === "automated") {
        const path = decodeURIComponent(segments.slice(storageMarker + 1).join("/"));
        if (path.startsWith("automated/") && !path.split("/").some(part => part === "." || part === "..")) candidates.add(path);
      }
      if (parsed.hostname.toLowerCase() === "res.cloudinary.com") {
        const uploadIndex = segments.indexOf("upload");
        if (uploadIndex >= 0) {
          const tail = segments.slice(uploadIndex + 1).filter(segment => !/^v\d+$/.test(segment));
          const generatedIndex = tail.findIndex(segment => segment.includes("auto-"));
          if (generatedIndex >= 0) {
            const publicId = tail.slice(generatedIndex).join("/").replace(/\.(mp4|webm|mov|m4v)$/i, "");
            if (publicId) candidates.add(publicId);
          }
        }
      }
    } catch {
      // Plain public IDs and Storage paths are also valid candidates.
    }
  };
  const visit = (value: unknown): void => {
    if (typeof value === "string") addText(value);
    else if (Array.isArray(value)) for (const item of value) visit(item);
    else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        visit(key);
        visit(item);
      }
    }
  };
  for (const source of sources) visit(source);
  return [...candidates];
}

function scrubGeneratedVideoReferences(value: unknown, candidates: ReadonlySet<string>): unknown {
  if (typeof value === "string") {
    return findGeneratedVideoReferences(value, candidates).length > 0 ? null : value;
  }
  if (Array.isArray(value)) return value.map((item) => scrubGeneratedVideoReferences(item, candidates));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (findGeneratedVideoReferences(key, candidates).length > 0) continue;
      next[key] = scrubGeneratedVideoReferences(item, candidates);
    }
    return next;
  }
  return value;
}

function hasConfirmedSocialDelivery(row: {
  status: string;
  target_platforms: unknown;
  metadata: unknown;
}): boolean {
  if (row.status !== "published" || !Array.isArray(row.target_platforms) || row.target_platforms.length === 0) return false;
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};
  const rawResults = metadata.platformResults;
  const results: Record<string, unknown> = {};
  if (Array.isArray(rawResults)) {
    for (const item of rawResults) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const entry = item as Record<string, unknown>;
        if (typeof entry.platform === "string") results[entry.platform] = entry;
      }
    }
  } else if (rawResults && typeof rawResults === "object") {
    Object.assign(results, rawResults);
  }
  const supported = new Set(["facebook", "facebook_reels", "youtube"]);
  return row.target_platforms.every((target) => {
    if (typeof target !== "string" || !supported.has(target)) return false;
    const result = results[target];
    if (!result || typeof result !== "object" || Array.isArray(result)) return false;
    const delivery = result as Record<string, unknown>;
    return delivery.ok === true && typeof delivery.remoteId === "string" && delivery.remoteId.trim().length > 0;
  });
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary video storage is not configured on the server.");
  }
  return { cloudName, apiKey, apiSecret };
}

function isGeneratedZikrVideo(asset: CloudinaryAsset): boolean {
  const tags = new Set(Array.isArray(asset.tags) ? asset.tags : []);
  const isGenerated = tags.has("zikr-generated") ||
    (tags.has("zikr") && tags.has("cloudinary-migration"));
  return asset.resource_type === "video" &&
    asset.type === "upload" &&
    asset.format === "mp4" &&
    typeof asset.public_id === "string" &&
    asset.public_id.startsWith("auto-") &&
    isGenerated &&
    tags.has("automated");
}

async function listGeneratedVideos(): Promise<CloudinaryAsset[]> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`;
  const authorization = "Basic " + Buffer.from(apiKey + ":" + apiSecret).toString("base64");
  const assets: CloudinaryAsset[] = [];
  let nextCursor: string | undefined;

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expression: "resource_type:video AND tags=automated",
        max_results: 500,
        with_field: ["tags"],
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as CloudinarySearchPage & {
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(payload.error?.message || "Cloudinary generated-video inventory lookup failed.");
    }
    assets.push(...(payload.resources ?? []).filter(isGeneratedZikrVideo));
    nextCursor = payload.next_cursor;
    if (!nextCursor) return assets;
  }

  throw new Error("Cloudinary generated-video inventory exceeded the safe pagination limit.");
}

async function deleteCloudinaryVideo(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureBase = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");
  const form = new URLSearchParams({
    public_id: publicId,
    timestamp,
    invalidate: "true",
    api_key: apiKey,
    signature,
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );
  const result = await response.json().catch(() => ({})) as {
    result?: string;
    error?: { message?: string };
  };
  if (!response.ok || (result.result !== "ok" && result.result !== "not found")) {
    throw new Error(result.error?.message || `Cloudinary could not delete generated video ${publicId}.`);
  }
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  task: (value: T) => Promise<void>,
): Promise<string[]> {
  const errors: string[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= values.length) return;
      try {
        await task(values[current]);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  });
  await Promise.all(workers);
  return errors;
}

async function listAutomatedStorageObjects(): Promise<string[]> {
  const supabase = createAdminClient();
  const bucket = supabase.storage.from("videos");
  const paths = new Set<string>();

  const walk = async (prefix: string): Promise<void> => {
    let fullyEnumerated = false;
    for (let offset = 0; offset <= MAX_AUTOMATED_STORAGE_OBJECTS; offset += 1000) {
      const { data, error } = await bucket.list(prefix, {
        limit: offset === MAX_AUTOMATED_STORAGE_OBJECTS ? 1 : 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Supabase video Storage inventory failed: ${error.message}`);
      const objects = data ?? [];
      if (offset === MAX_AUTOMATED_STORAGE_OBJECTS) {
        if (objects.length > 0) {
          throw new Error("Automated video Storage inventory exceeded the safe pagination limit.");
        }
        fullyEnumerated = true;
        break;
      }
      for (const object of objects) {
        if (!object.name || object.name === "." || object.name === "..") continue;
        const path = `${prefix}/${object.name}`;
        if (object.id || object.metadata) {
          paths.add(path);
          if (paths.size > MAX_AUTOMATED_STORAGE_OBJECTS) {
            throw new Error("Automated video Storage inventory exceeded the safe 5,000-object limit.");
          }
        } else await walk(path);
      }
      if (objects.length < 1000) {
        fullyEnumerated = true;
        break;
      }
    }
    if (!fullyEnumerated) {
      throw new Error("Automated video Storage inventory exceeded the safe pagination limit.");
    }
  };

  await walk("automated");
  return [...paths].filter(path =>
    path.startsWith("automated/") &&
    !path.split("/").some(part => part === "." || part === ".."),
  );
}

async function deleteAutomatedStorageObjects(paths: string[]): Promise<number> {
  if (!paths.length) return 0;
  const bucket = createAdminClient().storage.from("videos");
  let removed = 0;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { data, error } = await bucket.remove(batch);
    if (error) throw new Error(`Supabase video Storage deletion failed: ${error.message}`);
    removed += data?.length ?? batch.length;
  }
  return removed;
}

const PURGE_LOCK_DESCRIPTION = "Temporary lock preventing internal video generation while ZIKR-owned generated media is being purged.";

async function acquirePurgeLock(token: string): Promise<boolean> {
  const description = `${PURGE_LOCK_DESCRIPTION} ${token}`;
  const updated = await supabaseServerAdminRequest<Array<{ key: string }>>(
    "/rest/v1/admin_settings?key=eq.video_purge_in_progress&value=eq.false&select=key",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ value: true, description, updated_at: new Date().toISOString() }),
    },
  );
  if ((updated ?? []).length > 0) return true;

  // If the row does not exist, insert it without overwriting a concurrent
  // request. The unique key plus ignore-duplicates makes this a compare-and-set.
  const inserted = await supabaseServerAdminRequest<Array<{ key: string }>>(
    "/rest/v1/admin_settings?on_conflict=key&select=key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({
        key: "video_purge_in_progress",
        value: true,
        description,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  return (inserted ?? []).length > 0;
}

async function releasePurgeLock(token: string): Promise<void> {
  const description = `${PURGE_LOCK_DESCRIPTION} ${token}`;
  const released = await supabaseServerAdminRequest<Array<{ key: string }>>(
    `/rest/v1/admin_settings?key=eq.video_purge_in_progress&description=eq.${encodeURIComponent(description)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        value: false,
        description: PURGE_LOCK_DESCRIPTION,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if ((released ?? []).length === 0) {
    throw new Error("Purge lock ownership changed before release; leaving the worker lock enabled.");
  }
}

async function getVideoAutomationEnabled(): Promise<boolean> {
  const rows = await supabaseServerAdminRequest<Array<{ value: unknown }>>(
    "/rest/v1/admin_settings?key=eq.video_automation_enabled&select=value&limit=1",
  );
  return isVideoAutomationEnabled(rows?.[0]?.value);
}

async function restoreVideoAutomation(enabled: boolean): Promise<void> {
  await supabaseServerAdminRequest(
    "/rest/v1/admin_settings?key=eq.video_automation_enabled",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ value: enabled, updated_at: new Date().toISOString() }),
    },
  );
}

async function pauseVideoAutomation(): Promise<void> {
  await supabaseServerAdminRequest(
    "/rest/v1/admin_settings?key=eq.video_automation_enabled",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ value: false, updated_at: new Date().toISOString() }),
    },
  );
}

async function getActiveVideoWork(): Promise<{ generation: number; publications: number }> {
  const [generationRows, publicationRows] = await Promise.all([
    supabaseServerAdminRequest<Array<{ id: string }>>(
      "/rest/v1/video_generation_requests?status=eq.processing&select=id&limit=100",
    ),
    supabaseServerAdminRequest<Array<{ id: string }>>(
      "/rest/v1/content_publish_queue?content_table=eq.videos&status=in.(queued,processing)&select=id&limit=100",
    ),
  ]);
  return {
    generation: generationRows?.length ?? 0,
    publications: publicationRows?.length ?? 0,
  };
}

export async function GET() {
  const auth = await requireAdminApi("video.delete");
  if (!auth.ok) return NextResponse.json({ allowed: false }, { status: auth.status });
  return NextResponse.json({ allowed: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminStepUpApi("video.delete", "/admin/media");
  if (!auth.ok) return NextResponse.json({ error: auth.error, nextPath: "nextPath" in auth ? auth.nextPath : undefined }, { status: auth.status, headers: { "Cache-Control": "no-store" } });

  let automationWasEnabled: boolean | undefined;
  let purgeLockToken: string | null = null;
  let destructiveWorkStarted = false;
  let dataCleanupFinished = false;
  try {
    const parsedBody = await readBoundedJsonBody(request);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const body = parsedBody.value as { confirmation?: unknown; scope?: unknown };
    if (body.confirmation !== CONFIRMATION_PHRASE) {
      return NextResponse.json(
        { error: `اكتب العبارة التالية حرفيًا للتأكيد: ${CONFIRMATION_PHRASE}` },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const scope = body.scope;
    if (scope !== "files" && scope !== "memory" && scope !== "both") {
      return NextResponse.json(
        { error: "Invalid purge scope. Choose files, memory, or both." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const includeFiles = scope === "files" || scope === "both";
    const includeMemory = scope === "memory" || scope === "both";

    const cloudinary = includeFiles ? cloudinaryConfig() : null;
    const lockToken = randomUUID();
    const lockAcquired = await acquirePurgeLock(lockToken);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "يوجد تنظيف آخر قيد التنفيذ. لم يبدأ أي حذف؛ أعد المحاولة بعد انتهائه.", deletionStarted: false, retryRequired: true },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    purgeLockToken = lockToken;
    automationWasEnabled = await getVideoAutomationEnabled();
    await pauseVideoAutomation();

    const processing = await getActiveVideoWork();
    if (processing.generation > 0 || processing.publications > 0) {
      // No destructive work started; restore the prior setting and release our lock.
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: `يوجد ${processing.generation} طلب توليد و${processing.publications} عملية نشر فيديو مجدولة أو قيد التنفيذ. لم يبدأ الحذف؛ أكمل النشر أو ألغِه ثم أعد المحاولة.`,
          processing,
          paused: false,
          automationMustBeReenabled: false,
          retryRequired: true,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const pendingSocialQueueMedia = includeFiles
      ? await supabaseServerAdminRequest<Array<{ video_url: string | null }>>(
          "/rest/v1/social_publish_queue?status=neq.published&video_url=not.is.null&select=video_url&limit=1000",
        )
      : [];
    if (includeFiles && (pendingSocialQueueMedia ?? []).length >= 1000) {
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: "تعذر التحقق من جميع عناصر طابور النشر بأمان. لم يبدأ الحذف؛ قلّص الطابور أو عالج العناصر ثم أعد المحاولة.",
          protectedSocialQueueItems: null,
          deletionStarted: false,
          paused: false,
          retryRequired: true,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    const protectedSocialQueueMedia = new Set(
      (pendingSocialQueueMedia ?? [])
        .map((row) => row.video_url)
        .filter((value): value is string => isGeneratedCloudinaryVideoUrl(value, cloudinary?.cloudName ?? "")),
    );
    if (includeFiles && protectedSocialQueueMedia.size > 0) {
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: `يوجد ${protectedSocialQueueMedia.size} فيديو مرتبط بعناصر نشر لم تكتمل بعد. لم يبدأ حذف أي ملف؛ أعد محاولة النشر أو عالج العناصر أولًا.`,
          protectedSocialQueueItems: protectedSocialQueueMedia.size,
          deletionStarted: false,
          paused: false,
          retryRequired: true,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const pendingSocialGenerationRefs = (includeFiles || includeMemory)
      ? await supabaseServerAdminRequest<Array<{ id: string }>>(
          "/rest/v1/social_publish_queue?status=neq.published&or=(content_type.like.*video*,video_url.not.is.null)&select=id&limit=1000",
        )
      : [];
    if ((includeFiles || includeMemory) && (pendingSocialGenerationRefs ?? []).length >= 1000) {
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: "تعذر التحقق من جميع مراجع طلبات الفيديو في طابور النشر. لم يبدأ حذف سجل التوليد.",
          protectedGenerationRequestCount: null,
          deletionStarted: false,
          paused: false,
          retryRequired: true,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if ((includeFiles || includeMemory) && (pendingSocialGenerationRefs ?? []).length > 0) {
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: `يوجد ${pendingSocialGenerationRefs.length} عنصر نشر اجتماعي غير مكتمل مرتبط بوسيط فيديو. تم الحفاظ على سجل التوليد ولم يبدأ الحذف.`,
          protectedGenerationRequestCount: pendingSocialGenerationRefs.length,
          deletionStarted: false,
          paused: false,
          retryRequired: true,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Complete every bounded database inventory before the first external or
    // database deletion. A limit hit must never leave a partially purged library.
    const generatedCatalogRows = await supabaseServerAdminRequest<Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      thumbnail_url: string | null;
      metadata: Record<string, unknown> | null;
      published: boolean | null;
      youtube_id: string | null;
    }>>(
      "/rest/v1/videos?metadata->>generator=eq.zikr_internal_video_factory&select=id,title,slug,description,thumbnail_url,metadata,published,youtube_id&limit=1000",
    );
    if ((generatedCatalogRows ?? []).length >= 1000) {
      throw new Error("Generated video catalog exceeded the safe purge batch; no files or catalog rows were changed.");
    }
    const generatedRequests = includeMemory || includeFiles
      ? await supabaseServerAdminRequest<Array<{ id: string; video_url: string | null; thumbnail_url: string | null; content: Record<string, unknown> | null }>>(
          "/rest/v1/video_generation_requests?automation_key=not.is.null&select=id,video_url,thumbnail_url,content&limit=1000",
        )
      : [];
    if (includeMemory && (generatedRequests ?? []).length >= 1000) {
      throw new Error("Automated generation history exceeded the safe purge batch; no files or catalog rows were changed.");
    }
    const automationRuns = includeMemory
      ? await supabaseServerAdminRequest<Array<{ id: string }>>(
          "/rest/v1/video_automation_runs?metadata->>generator=eq.multi-provider-free-ai&select=id&limit=1000",
        )
      : [];
    if (includeMemory && (automationRuns ?? []).length >= 1000) {
      throw new Error("Internal video automation history exceeded the safe purge batch; no files or catalog rows were changed.");
    }

    const assets = includeFiles ? await listGeneratedVideos() : [];
    // Inventory the dedicated project Storage prefix for both file and memory scopes.
    // Memory-only cleanup leaves every physical object untouched.
    const storagePaths = includeFiles ? await listAutomatedStorageObjects() : [];
    const processingAfterPreflight = await getActiveVideoWork();
    if (processingAfterPreflight.generation > 0 || processingAfterPreflight.publications > 0) {
      throw new Error(
        `Video generation or scheduled publication became active during purge preflight (${processingAfterPreflight.generation} generation request(s), ${processingAfterPreflight.publications} publication(s)); no deletion started.`,
      );
    }

    const referenceCandidates = collectGeneratedVideoCandidateValues(
      storagePaths,
      assets.map((asset) => asset.public_id ?? ""),
      generatedCatalogRows,
      generatedRequests,
    );
    const socialQueueInventory = await supabaseServerAdminRequest<Array<{
      id: string;
      status: string;
      target_platforms: unknown;
      video_url: string | null;
      image_url: string | null;
      metadata: Record<string, unknown> | null;
    }>>("/rest/v1/social_publish_queue?select=id,status,target_platforms,video_url,image_url,metadata&limit=1000");
    if ((socialQueueInventory ?? []).length >= 1000) {
      throw new Error("Social publication history exceeded the safe reference-audit limit; refusing cleanup.");
    }
    const unresolvedSocialReferences = (socialQueueInventory ?? [])
      .filter((row) => findGeneratedVideoReferences(row, referenceCandidates).length > 0)
      .filter((row) => !hasConfirmedSocialDelivery(row));
    const unmanagedReferences = await findUnmanagedGeneratedVideoReferences(
      createAdminClient(),
      referenceCandidates,
      {
        videos: new Set((generatedCatalogRows ?? []).map((row) => row.id)),
      },
    );
    if (unresolvedSocialReferences.length > 0 || unmanagedReferences.length > 0) {
      await restoreVideoAutomation(automationWasEnabled);
      if (purgeLockToken) {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
      }
      return NextResponse.json(
        {
          error: "تعذر الحذف بأمان: ما زالت هناك مراجع نشطة أو غير محسومة لملفات الفيديو. أكمل النشر أو أزل الارتباط من المحتوى أولًا ثم أعد المحاولة.",
          deletionStarted: false,
          paused: false,
          retryRequired: true,
          unresolvedSocialReferences: unresolvedSocialReferences.slice(0, 10).map((row) => row.id),
          unmanagedReferenceCount: unmanagedReferences.length,
          unmanagedReferenceSamples: unmanagedReferences.slice(0, 10).map((hit) => ({
            table: hit.table,
            column: hit.column,
            recordId: hit.recordId,
          })),
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (includeFiles && assets.length > 0) destructiveWorkStarted = true;
    const cloudinaryErrors = includeFiles
      ? await mapWithConcurrency(assets, 6, async asset => {
          if (!asset.public_id) throw new Error("Generated video asset is missing its public ID.");
          await deleteCloudinaryVideo(asset.public_id);
        })
      : [];
    if (cloudinaryErrors.length > 0) {
      throw new Error(
        `تعذر حذف ${cloudinaryErrors.length} ملفًا من Cloudinary. لم تُحذف سجلات الفيديو من قاعدة البيانات حتى يمكن إعادة المحاولة بأمان. ${cloudinaryErrors.slice(0, 3).join(" | ")}`,
      );
    }

    if (includeFiles && storagePaths.length > 0) destructiveWorkStarted = true;
    const storageObjectsDeleted = includeFiles ? await deleteAutomatedStorageObjects(storagePaths) : 0;
    if (includeFiles && storagePaths.length > 0) {
      const remainingStoragePaths = new Set(await listAutomatedStorageObjects());
      const remaining = storagePaths.filter((path) => remainingStoragePaths.has(path));
      if (remaining.length > 0) {
        throw new Error(`Supabase Storage still contains ${remaining.length} generated video object(s); refusing to finalize purge.`);
      }
    }
    if (includeFiles && assets.length > 0) {
      const deletedPublicIds = new Set(assets.map((asset) => asset.public_id).filter((value): value is string => Boolean(value)));
      const remainingAssets = await listGeneratedVideos();
      const remaining = remainingAssets.filter((asset) => asset.public_id && deletedPublicIds.has(asset.public_id));
      if (remaining.length > 0) {
        throw new Error(`Cloudinary still reports ${remaining.length} generated video asset(s) after deletion; refusing to finalize purge.`);
      }
    }
    // Remove Cloudinary masters without hiding videos that already have a
    // verified YouTube publication fallback. Unconfirmed IDs are never treated
    // as a playback fallback, and unpublished records remain unpublished.
    if ((generatedCatalogRows ?? []).length > 0) destructiveWorkStarted = true;
    let catalogRecordsHidden = 0;
    let catalogFallbackRowsKeptPublished = 0;
    const catalogUpdateErrors = await mapWithConcurrency(generatedCatalogRows ?? [], 6, async row => {
      const previousMetadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      const fallbackId = includeFiles ? getConfirmedYoutubeFallbackId(row) : null;
      const keepPublishedFallback = shouldKeepPublishedVideoAfterMediaPurge(row, includeFiles && !includeMemory);
      if (keepPublishedFallback) catalogFallbackRowsKeptPublished += 1;
      else catalogRecordsHidden += 1;
      const now = new Date().toISOString();
      const nextMetadata = includeMemory
        ? {
            ...previousMetadata,
            generatedVideoUrl: null,
            videoUrl: null,
            video_url: null,
            sourceVideoUrl: null,
            thumbnailUrl: null,
            sourceUrl: null,
            sourceLabel: null,
            sourceHash: null,
            contentHash: null,
            templateVersion: null,
            storyText: null,
            socialCaption: null,
            caption: null,
            automatedVideoQa: null,
            qualityReview: null,
            approvalStatus: null,
            approvalReviewerId: null,
            approvalReviewedAt: null,
            approvalSnapshotHash: null,
            contentFormat: null,
            aiMode: null,
            sourceType: null,
            seriesId: null,
            seriesTitle: null,
            learningObjective: null,
            seasonNumber: null,
            episodeNumber: null,
            mediaState: includeFiles ? "purged" : "unlinked",
            mediaFallbackAvailable: includeFiles && fallbackId !== null,
            mediaPurgedFromPublished: includeFiles ? wasPublishedBeforeMediaPurge(row) : false,
            mediaPurgedAt: includeFiles ? now : previousMetadata.mediaPurgedAt ?? null,
            memoryPurgedAt: now,
            videoMemoryPurged: true,
          }
        : {
            ...previousMetadata,
            generatedVideoUrl: keepPublishedFallback ? previousMetadata.generatedVideoUrl ?? null : null,
            videoUrl: null,
            video_url: null,
            sourceVideoUrl: null,
            thumbnailUrl: null,
            mediaState: "purged",
            mediaFallbackAvailable: fallbackId !== null,
            mediaPurgedFromPublished: wasPublishedBeforeMediaPurge(row),
            mediaPurgedAt: now,
          };
      await supabaseServerAdminRequest("/rest/v1/videos?id=eq." + encodeURIComponent(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          published: keepPublishedFallback,
          ...(includeMemory
            ? {
                title: keepPublishedFallback ? row.title : "فيديو تمت إزالة ذاكرته",
                slug: keepPublishedFallback ? row.slug : "purged-" + row.id,
                description: keepPublishedFallback ? row.description : null,
                thumbnail_url: keepPublishedFallback && fallbackId
                  ? "https://i.ytimg.com/vi/" + encodeURIComponent(fallbackId) + "/hqdefault.jpg"
                  : null,
                youtube_id: keepPublishedFallback && fallbackId ? fallbackId : null,
              }
            : {
                description: keepPublishedFallback && fallbackId
                  ? scrubGeneratedVideoReferences(row.description, new Set(referenceCandidates)) as string | null
                  : scrubGeneratedVideoReferences(row.description, new Set(referenceCandidates)) as string | null,
                thumbnail_url: keepPublishedFallback && fallbackId
                  ? "https://i.ytimg.com/vi/" + encodeURIComponent(fallbackId) + "/hqdefault.jpg"
                  : null,
                ...(keepPublishedFallback && fallbackId ? { youtube_id: fallbackId } : {}),
              }),
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        }),
      });
      await supabaseServerAdminRequest(
        "/rest/v1/content_publish_queue?content_table=eq.videos&content_id=eq." +
          encodeURIComponent(row.id) + "&status=in.(queued,processing)",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "failed",
            error_message: keepPublishedFallback
              ? "No internal upload is required; the already-published YouTube fallback remains public."
              : "Internal video publication was stopped by the administrator project-memory cleanup.",
            updated_at: new Date().toISOString(),
          }),
        },
      );
    });
    if (catalogUpdateErrors.length) {
      throw new Error("Some internal catalog records or scheduled publication entries could not be safely unlinked: " + catalogUpdateErrors.slice(0, 3).join(" | "));
    }
    if (includeFiles && !includeMemory && (generatedRequests ?? []).length > 0) {
      const fallbackRequestIds = new Set(
        (generatedCatalogRows ?? [])
          .filter((row) => shouldKeepPublishedVideoAfterMediaPurge(row, true))
          .map((row) => {
            const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
            return typeof metadata.videoGenerationRequestId === "string" ? metadata.videoGenerationRequestId : "";
          })
          .filter(Boolean),
      );
      for (const generatedRequest of generatedRequests ?? []) {
        const content = generatedRequest.content && typeof generatedRequest.content === "object"
          ? generatedRequest.content
          : {};
        const cleanedContent = scrubGeneratedVideoReferences(content, new Set(referenceCandidates));
        const keepSnapshotForYouTubeFallback = fallbackRequestIds.has(generatedRequest.id);
        await supabaseServerAdminRequest(
          "/rest/v1/video_generation_requests?id=eq." + encodeURIComponent(generatedRequest.id),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({
              video_url: keepSnapshotForYouTubeFallback ? generatedRequest.video_url : null,
              thumbnail_url: null,
              content: cleanedContent,
              updated_at: new Date().toISOString(),
            }),
          },
        );
      }
    }

    // Historical social queue rows are read-only audited; neither the queue nor external platform posts are modified.
    const socialQueueRowsPreserved = true;
    let generationRowsRedacted = 0;
    let automationRunsRedacted = 0;
    if (includeMemory && (generatedRequests ?? []).length > 0) destructiveWorkStarted = true;
    for (const generatedRequest of generatedRequests ?? []) {
      const purgedAt = new Date().toISOString();
      await supabaseServerAdminRequest(
        "/rest/v1/video_generation_requests?id=eq." + encodeURIComponent(generatedRequest.id),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            title: "سجل فيديو تمت إزالة ذاكرته",
            description: null,
            content: { memoryPurged: true, purgedAt, retainedRequestId: generatedRequest.id },
            duration: null,
            thumbnail_url: null,
            status: "cancelled",
            youtube_id: null,
            facebook_id: null,
            error_message: "Project video memory was purged by an administrator.",
            error_details: null,
            heygen_video_id: null,
            heygen_status: null,
            heygen_submitted_at: null,
            heygen_last_polled_at: null,
            video_url: null,
            content_hash: null,
            source_hash: null,
            provider: null,
            provider_job_id: null,
            template_version: null,
            generation_attempts: 0,
            last_attempt_at: null,
            next_retry_at: null,
            publish_status: null,
            scene: null,
            render_duration_ms: null,
            updated_at: purgedAt,
          }),
        },
      );
      generationRowsRedacted += 1;
    }
    if (includeMemory && (automationRuns ?? []).length > 0) destructiveWorkStarted = true;
    for (const run of automationRuns ?? []) {
      const purgedAt = new Date().toISOString();
      await supabaseServerAdminRequest(
        "/rest/v1/video_automation_runs?id=eq." + encodeURIComponent(run.id),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            provider_stats: { memoryPurged: true, purgedAt },
            error_summary: null,
            metadata: { generator: "multi-provider-free-ai", memoryPurged: true, purgedAt },
          }),
        },
      );
      automationRunsRedacted += 1;
    }

    dataCleanupFinished = true;
    await restoreVideoAutomation(automationWasEnabled);
    if (purgeLockToken) {
      await releasePurgeLock(purgeLockToken);
      purgeLockToken = null;
    }
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
      action: "video.library.purge",
      permission: "video.delete",
      resourceType: "generated_video_library",
      metadata: {
        scope,
        cloudinaryAssetsDeleted: assets.length,
        cloudinaryBytesDeleted: assets.reduce((sum, asset) => sum + Number(asset.bytes ?? 0), 0),
        storageObjectsDeleted,
        socialQueueRowsPreserved,
        publicVideoCatalogPreserved: true,
        manualPublicVideoCatalogPreserved: true,
        catalogRecordsRetained: true,
        generatedCatalogRecordsHidden: catalogRecordsHidden,
        catalogRecordsHidden,
        catalogFallbackRowsKeptPublished,
        generationMemoryRedacted: includeMemory,
        generationMediaPointersCleared: includeFiles && !includeMemory ? (generatedRequests ?? []).length : 0,
        generationMediaPointersCleared: includeFiles && !includeMemory ? (generatedRequests ?? []).length : 0,
        physicalFilesDeleted: includeFiles,
        generationRowsRedacted,
        automationRunsRedacted,
        externalSocialPostsDeleted: false,
      },
      }),
      (auditError) => console.error("[api/admin/video-purge] audit event failed after committed mutation:", auditError),
    );

    for (const path of ["/videos", "/admin/media", "/admin/memory", "/admin/video/requests", "/admin/videos"]) {
      revalidatePath(path);
    }

    return NextResponse.json(
      {
        ok: true,
        auditRecorded,
        paused: !automationWasEnabled,
        automationRemainsDisabled: !automationWasEnabled,
        automationResumed: automationWasEnabled,
        scope,
        cloudinaryAssetsDeleted: assets.length,
        cloudinaryBytesDeleted: assets.reduce((sum, asset) => sum + Number(asset.bytes ?? 0), 0),
        storageObjectsDeleted,
        socialQueueRowsPreserved,
        publicVideoCatalogPreserved: true,
        manualPublicVideoCatalogPreserved: true,
        catalogRecordsRetained: true,
        generatedCatalogRecordsHidden: catalogRecordsHidden,
        catalogRecordsHidden,
        catalogFallbackRowsKeptPublished,
        generationMemoryRedacted: includeMemory,
        physicalFilesDeleted: includeFiles,
        generationRowsRedacted,
        automationRunsRedacted,
        externalSocialPostsDeleted: false,
        note: includeFiles && includeMemory
          ? "تم حذف الملفات المولّدة من التخزين وحجب ذاكرة التوليد. احتُفظ بمعرّفات سجلات التوليد كعلامات تاريخية كي لا تنكسر مراجع الطابور. لم تُحذف منشورات Facebook أو YouTube."
          : includeFiles
            ? "تم حذف ملفات الفيديو المولّدة فقط مع الاحتفاظ بسجل المصدر والجودة، وإزالة مؤشرات الملفات المحذوفة من طلبات التوليد. لم تُحذف المنشورات الخارجية."
            : "تم حجب محتوى الفيديوهات المولّدة وسجلات الطلبات مع الاحتفاظ بمعرّفاتها وملفات التخزين. لم تُحذف أو تُعدّل المنشورات الخارجية.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/video-purge] POST:", error);
    const recoveryErrors: string[] = [];
    if (automationWasEnabled !== undefined &&
      (!destructiveWorkStarted || dataCleanupFinished)) {
      try {
        await restoreVideoAutomation(automationWasEnabled);
      } catch (recoveryError) {
        recoveryErrors.push("automation state: " + (recoveryError instanceof Error ? recoveryError.message : String(recoveryError)));
      }
    }
    let purgeLockCleared = !purgeLockToken;
    if (purgeLockToken) {
      try {
        await releasePurgeLock(purgeLockToken);
        purgeLockToken = null;
        purgeLockCleared = true;
      } catch (recoveryError) {
        recoveryErrors.push("purge lock: " + (recoveryError instanceof Error ? recoveryError.message : String(recoveryError)));
      }
    }
    const automationRemainsDisabled =
      automationWasEnabled === false ||
      (automationWasEnabled === true &&
        (recoveryErrors.some(message => message.startsWith("automation state:")) ||
          (destructiveWorkStarted && !dataCleanupFinished))) ||
      !purgeLockCleared;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "تعذر إتمام تصفير الفيديوهات.",
        paused: automationRemainsDisabled,
        automationRemainsDisabled,
        purgeLockCleared,
        partialPurge: destructiveWorkStarted && !dataCleanupFinished,
        retryRequired: true,
        ...(recoveryErrors.length ? { recoveryErrors } : {}),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
