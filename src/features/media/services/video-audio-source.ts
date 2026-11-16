const ALLOWED_NARRATION_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
]);
const ALLOWED_NARRATION_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".webm"]);
export const MAX_ADMIN_NARRATION_BYTES = 15 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export type ParsedAdminNarrationAssetUrl = { url: string; publicId: string };

export function parseAdminNarrationAssetUrl(
  value: unknown,
  cloudName: string | null | undefined,
): ParsedAdminNarrationAssetUrl | null {
  if (typeof value !== "string" || !value.trim() || !cloudName?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.port
    ) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== cloudName.trim() || parts[1] !== "video" || parts[2] !== "upload") return null;
    const mediaParts = parts.slice(3);
    const version = mediaParts[0] ?? "";
    if (/^v\d+$/.test(version)) mediaParts.shift();

    const fileName = mediaParts.pop() ?? "";
    const dot = fileName.lastIndexOf(".");
    const extension = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
    const publicId = [...mediaParts, dot > 0 ? fileName.slice(0, dot) : fileName].join("/");
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
    if (!ALLOWED_NARRATION_EXTENSIONS.has(extension) || !new RegExp("^audio-human-" + uuid + "$", "i").test(publicId)) {
      return null;
    }
    return { url: url.toString(), publicId };
  } catch {
    return null;
  }
}

export function isCanonicalQuranAyahAudioUrl(
  value: unknown,
  baseUrl: string,
  surahId: unknown,
  ayahNumber: unknown,
): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const surah = Number(surahId);
  const ayah = Number(ayahNumber);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) return false;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) return false;
    const normalizedBase = base.toString().replace(/\/$/, "");
    const expected = `${normalizedBase}/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
    const actual = new URL(value.trim());
    return actual.toString() === new URL(expected).toString();
  } catch {
    return false;
  }
}

export type ResolvedVideoAudioSource =
  | { kind: "quran"; url: string }
  | { kind: "human_recording"; url: string; publicId: string; mediaAssetId: string | null };

export function resolveVideoAudioSource(input: {
  category: string;
  audioUrl: unknown;
  audioSource: unknown;
  audioMediaAssetId: unknown;
  cloudinaryCloudName?: string | null;
  quranAudioBaseUrl: string;
  surahId: unknown;
  ayahNumber: unknown;
}): ResolvedVideoAudioSource | null {
  if (input.category === "quran") {
    if (input.audioSource === "human_recording") return null;
    return isCanonicalQuranAyahAudioUrl(input.audioUrl, input.quranAudioBaseUrl, input.surahId, input.ayahNumber)
      ? { kind: "quran", url: input.audioUrl.trim() }
      : null;
  }
  if (input.audioSource !== "human_recording") return null;
  const parsed = parseAdminNarrationAssetUrl(input.audioUrl, input.cloudinaryCloudName);
  if (!parsed) return null;
  const mediaAssetId = typeof input.audioMediaAssetId === "string" ? input.audioMediaAssetId.trim() : "";
  return { kind: "human_recording", url: parsed.url, publicId: parsed.publicId, mediaAssetId: mediaAssetId || null };
}

export function isReadyAdminNarrationAsset(
  value: unknown,
  expected: { assetId?: string | null; url: string; publicId: string; uploaderId: string },
): boolean {
  if (!isRecord(value) || !isRecord(value.metadata)) return false;
  const metadata = value.metadata;
  const sizeBytes = Number(value.size_bytes);
  const mimeType = typeof value.mime_type === "string" ? value.mime_type : "";
  return (
    typeof value.id === "string" &&
    (!expected.assetId || value.id === expected.assetId) &&
    value.url === expected.url &&
    value.storage_path === expected.publicId &&
    value.media_type === "audio" &&
    value.asset_type === "audio" &&
    value.mime_type === metadata.content_type &&
    ALLOWED_NARRATION_MIME_TYPES.has(mimeType) &&
    Number.isFinite(sizeBytes) &&
    sizeBytes > 0 &&
    sizeBytes <= MAX_ADMIN_NARRATION_BYTES &&
    value.created_by === expected.uploaderId &&
    value.published === false &&
    metadata.provider === "cloudinary" &&
    metadata.cloudinary_public_id === expected.publicId &&
    metadata.purpose === "video_generation_narration" &&
    metadata.upload_state === "ready" &&
    metadata.audit_recorded === true &&
    metadata.uploaded_by === expected.uploaderId
  );
}
