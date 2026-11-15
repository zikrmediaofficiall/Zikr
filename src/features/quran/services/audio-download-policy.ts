const MP3QURAN_AUDIO_HOST = /^server[0-9]+\.mp3quran\.net$/i;
const SUPABASE_AUDIO_BUCKET_PREFIX = "/storage/v1/object/public/quran-audio/";

export function isAllowedQuranAudioUrl(
  value: unknown,
  supabaseUrl: string | undefined =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
): boolean {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const rawValue = value.trim();
    const rawPath = rawValue.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/, 1)[0];
    if (/(?:^|\/)(?:\.{1,2})(?:\/|$)/.test(rawPath) || /%(?:2e|2f|5c)/i.test(rawPath)) return false;
    const url = new URL(rawValue);
    if (url.username || url.password || url.search || url.hash) return false;

    const segments = url.pathname.split("/").filter(Boolean);
    for (const segment of segments) {
      const decoded = decodeURIComponent(segment);
      if (
        decoded === "." ||
        decoded === ".." ||
        decoded.includes("/") ||
        decoded.includes("\\")
      ) {
        return false;
      }
    }

    if (
      url.protocol === "https:" &&
      !url.port &&
      MP3QURAN_AUDIO_HOST.test(url.hostname) &&
      url.pathname.toLowerCase().endsWith(".mp3")
    ) {
      return true;
    }

    if (!supabaseUrl) return false;
    const projectUrl = new URL(supabaseUrl);
    const isExactSupabaseOrigin = url.origin === projectUrl.origin;
    const isLocalDevelopmentOrigin =
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1", "::1"].includes(projectUrl.hostname) &&
      isExactSupabaseOrigin &&
      (url.protocol === "http:" || url.protocol === "https:");

    if (
      !isExactSupabaseOrigin ||
      (url.protocol !== "https:" && !isLocalDevelopmentOrigin)
    ) {
      return false;
    }

    return (
      url.pathname.startsWith(SUPABASE_AUDIO_BUCKET_PREFIX) &&
      url.pathname.toLowerCase().endsWith(".mp3")
    );
  } catch {
    return false;
  }
}

export function isValidQuranAudioDownloadRequest(
  surahId: unknown,
  reciterCode: unknown,
): boolean {
  return (
    typeof surahId === "number" &&
    Number.isInteger(surahId) &&
    surahId >= 1 &&
    surahId <= 114 &&
    typeof reciterCode === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(reciterCode) &&
    !reciterCode.includes("..")
  );
}

export function isSafeQuranAudioDownloadPath(value: unknown): value is string {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("\\") || value.includes("%")) {
    return false;
  }

  const match = /^quran-audio\/([A-Za-z0-9][A-Za-z0-9._-]{0,79})\/([1-9]|[1-9][0-9]|10[0-9]|11[0-4])\.mp3$/.exec(value);
  return Boolean(match && !match[1].includes(".."));
}
