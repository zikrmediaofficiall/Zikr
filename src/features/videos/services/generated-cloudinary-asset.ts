import { createHash } from "node:crypto";

type CloudinaryAsset = {
  public_id?: string;
  resource_type?: string;
  type?: string;
  format?: string;
  tags?: string[];
};

type CloudinarySearchResponse = {
  resources?: CloudinaryAsset[];
  error?: { message?: string };
};

type CloudinaryDestroyResponse = {
  result?: string;
  error?: { message?: string };
};

function resolveGeneratedCloudinaryIdentity(videoUrl: string, cloudName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    throw new Error("رابط ملف الفيديو غير صالح.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== "res.cloudinary.com" ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("لا يمكن حذف ملف خارج نطاق Cloudinary الموثوق.");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (
    segments.length !== 5 ||
    segments[0] !== cloudName ||
    segments[1] !== "video" ||
    segments[2] !== "upload" ||
    !/^v\d+$/.test(segments[3])
  ) {
    throw new Error("مسار ملف الفيديو لا يطابق صيغة ملفات ZIKR المولّدة.");
  }

  const match = segments[4].match(/^(auto-[a-z0-9-]+)\.mp4$/i);
  if (!match) throw new Error("الملف ليس ملف MP4 مولّدًا بصيغة ZIKR المعتمدة.");
  return match[1];
}

function isOwnedGeneratedVideo(asset: CloudinaryAsset, publicId: string): boolean {
  const tags = new Set(Array.isArray(asset.tags) ? asset.tags : []);
  const hasZikrTag = tags.has("zikr-generated") ||
    (tags.has("zikr") && tags.has("cloudinary-migration"));
  return asset.public_id === publicId &&
    asset.resource_type === "video" &&
    asset.type === "upload" &&
    asset.format === "mp4" &&
    publicId.startsWith("auto-") &&
    tags.has("automated") &&
    hasZikrTag;
}

export type VerifiedGeneratedCloudinaryVideo = {
  publicId: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Verifies ownership with Cloudinary before the database mutation begins.
 * Keep this separate from destruction so the DB can atomically delete the
 * request under its advisory lock before the external asset is removed.
 */
export async function verifyGeneratedCloudinaryVideo(
  videoUrl: string,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<VerifiedGeneratedCloudinaryVideo> {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("إعدادات Cloudinary غير مكتملة؛ لم يتم حذف أي ملف.");
  }

  const publicId = resolveGeneratedCloudinaryIdentity(videoUrl, cloudName);
  const authorization = "Basic " + Buffer.from(apiKey + ":" + apiSecret).toString("base64");
  const searchUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`;
  const searchResponse = await fetcher(searchUrl, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({
      expression: `resource_type:video AND type:upload AND tags=automated AND public_id=${publicId}`,
      max_results: 10,
      with_field: ["tags"],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const searchPayload = await searchResponse.json().catch(() => ({})) as CloudinarySearchResponse;
  if (!searchResponse.ok) {
    throw new Error(searchPayload.error?.message || "تعذر التحقق من ملكية ملف الفيديو في Cloudinary.");
  }
  const matches = (searchPayload.resources ?? []).filter((asset) => asset.public_id === publicId);
  if (matches.length !== 1 || !isOwnedGeneratedVideo(matches[0], publicId)) {
    throw new Error("لم يثبت أن ملف Cloudinary يخص مولّد ZIKR؛ تم إيقاف الحذف لحماية الملف.");
  }

  return { publicId, cloudName, apiKey, apiSecret };
}

export async function deleteVerifiedGeneratedCloudinaryVideo(
  asset: VerifiedGeneratedCloudinaryVideo,
  fetcher: typeof fetch = fetch,
): Promise<{ publicId: string }> {
  const { publicId, cloudName, apiKey, apiSecret } = asset;
  let lastError: Error | null = null;

  // Cloudinary destroy is idempotent ("not found" is success). Retry transient
  // network/5xx/rate-limit failures so a temporary provider interruption does
  // not leave an orphaned generated file after its request row was deleted.
  for (let attempt = 0; attempt < 3; attempt += 1) {
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

    try {
      const destroyResponse = await fetcher(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        },
      );
      const destroyPayload = await destroyResponse.json().catch(() => ({})) as CloudinaryDestroyResponse;
      if (destroyResponse.ok && (destroyPayload.result === "ok" || destroyPayload.result === "not found")) {
        return { publicId };
      }

      lastError = new Error(destroyPayload.error?.message || "رفض Cloudinary حذف ملف الفيديو المولّد.");
      const retryable = destroyResponse.status === 408 ||
        destroyResponse.status === 425 ||
        destroyResponse.status === 429 ||
        destroyResponse.status >= 500;
      if (!retryable || attempt === 2) throw lastError;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === 2) throw lastError;
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }

  throw lastError ?? new Error("تعذر تأكيد حذف ملف الفيديو من Cloudinary.");
}
