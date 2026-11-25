export const MAX_MEMORIZATION_AUDIO_BYTES = 3 * 1024 * 1024;
export const MEMORIZATION_AUDIO_LIMIT_MESSAGE = 'حجم التسجيل كبير جدًا. الحد الأقصى المسموح به هو 3 ميجابايت.';
export const MEMORIZATION_RATE_LIMIT_MESSAGE = 'وصلت إلى الحد الأقصى لتقييمات التسميع (3 مرات خلال 10 دقائق). حاول لاحقًا.';


export type MemorizationAudioMimeType = "audio/webm" | "audio/mp4" | "audio/ogg" | "audio/wav";

/** Accept only formats emitted by the recorder or documented for manual uploads. */
export function normalizeMemorizationAudioMimeType(value: unknown): MemorizationAudioMimeType | null {
  if (typeof value !== "string") return null;
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  switch (mediaType) {
    case "audio/webm":
      return "audio/webm";
    case "audio/mp4":
      return "audio/mp4";
    case "audio/ogg":
      return "audio/ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "audio/wav";
    default:
      return null;
  }
}

/** Match the declared MIME type to the container signature before forwarding bytes to Gemini. */
export function hasMemorizationAudioSignature(
  mimeType: MemorizationAudioMimeType,
  bytes: Uint8Array,
): boolean {
  if (!(bytes instanceof Uint8Array)) return false;
  const ascii = (start: number, end: number) =>
    Array.from(bytes.subarray(start, end), (byte) => String.fromCharCode(byte)).join("");

  switch (mimeType) {
    case "audio/webm":
      return bytes.length >= 4 &&
        bytes[0] === 0x1a && bytes[1] === 0x45 &&
        bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "audio/ogg":
      return bytes.length >= 4 && ascii(0, 4) === "OggS";
    case "audio/mp4":
      return bytes.length >= 12 && ascii(4, 8) === "ftyp";
    case "audio/wav":
      return bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  }
  return false;
}
