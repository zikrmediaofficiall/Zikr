const ORIGINAL_KIDS_FICTION_DISCLOSURE = "قصة تربوية خيالية أصلية من ذِكر — ليست آية أو حديثًا أو واقعة تاريخية.";
const ORIGINAL_EDITORIAL_DISCLOSURE = "محتوى تحريري أصلي من منصة ذِكر — غير منسوب إلى آية أو حديث.";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMarker(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isKidsAudienceMarker(value: unknown): boolean {
  return ["kids", "kid", "children", "child"].includes(normalizeMarker(value));
}

function isOriginalKidsFiction(content: Record<string, unknown>): boolean {
  return normalizeMarker(content.sourceType) === "original_kids_fiction" ||
    (isKidsAudienceMarker(content.audience) && normalizeMarker(content.aiMode) === "original_kids_story");
}

function hasMisleadingOriginalFictionAttribution(value: string | null): boolean {
  if (!value) return false;
  return /(?:https?:\/\/|www\.)|(?:قصة\s+موثقة|موثقة\s+في\s+مكتبة|إحالة\s+إلى\s+مصدرها|مصدرها\s+الأساسي|(?:^|\n)\s*(?:المصدر|المراجع|مرجع)\s*[:：])|(?:^|\n)\s*(?:sources?|references?|citations?)\s*[:：]|\b(?:based\s+on|adapted\s+from|quoted\s+from|according\s+to|as\s+(?:told|described|recorded|mentioned)\s+in)\s+(?:(?:the|a|an)\s+)?(?:qur['’]?an|hadith|sunnah|sahih(?:\s+al)?|bukhari|muslim|prophetic\s+tradition|islamic\s+history|historical\s+record|true\s+story|documented\s+story)\b/iu.test(value);
}

function resolveOriginalKidsFictionSourceLabel(value: unknown): string {
  const sourceLabel = cleanString(value);
  return sourceLabel && !hasMisleadingOriginalFictionAttribution(sourceLabel)
    ? sourceLabel
    : ORIGINAL_KIDS_FICTION_DISCLOSURE;
}

function resolveOriginalEditorialSourceLabel(value: unknown): string {
  const sourceLabel = cleanString(value);
  return sourceLabel && !hasMisleadingOriginalFictionAttribution(sourceLabel)
    ? sourceLabel
    : ORIGINAL_EDITORIAL_DISCLOSURE;
}

/**
 * Generic story automation must never consume child-directed series sources.
 * The admin catalogue can still expose both audiences; this filter is applied
 * only to the unattended general-story worker.
 */
export function filterGeneralStorySources<T extends {
  id: string;
  audience?: unknown;
  generationMode?: unknown;
  sourceType?: unknown;
}>(sources: readonly T[]): T[] {
  return sources.filter((source) => {
    const id = normalizeMarker(source.id);
    return !isKidsAudienceMarker(source.audience) &&
      normalizeMarker(source.generationMode) !== "free_deterministic_story_factory" &&
      normalizeMarker(source.sourceType) !== "original_kids_fiction" &&
      !id.startsWith("kids-series:");
  });
}

/** Keep original fiction/editorial copy from claiming an external source URL. */
export function resolveVideoSourceDisclosureLine(content: unknown, fallbackSourceUrl: string): string {
  const record = asRecord(content);
  const sourceType = normalizeMarker(record.sourceType);
  const sourceLabel = cleanString(record.sourceLabel);
  if (isOriginalKidsFiction(record)) return resolveOriginalKidsFictionSourceLabel(sourceLabel);
  if (sourceType === "editorial" || sourceType === "marketing") return resolveOriginalEditorialSourceLabel(sourceLabel);
  const sourceUrl = fallbackSourceUrl.trim();
  return sourceUrl ? "المصدر: " + sourceUrl : sourceLabel ?? "";
}

export function resolveKidsVideoPublicDisclosure(
  metadata: unknown,
  description: unknown,
  socialCaption: unknown,
): {
  sourceType: string | null;
  sourceLabel: string | null;
  description: string | null;
  socialCaption: string | null;
} {
  const record = asRecord(metadata);
  const originalFiction = isOriginalKidsFiction(record);
  const normalizedSourceType = normalizeMarker(record.sourceType);
  const sourceType = originalFiction ? "original_kids_fiction" : normalizedSourceType || cleanString(record.sourceType);
  const editorial = normalizedSourceType === "editorial" || normalizedSourceType === "marketing";
  const sourceLabel = originalFiction
    ? resolveOriginalKidsFictionSourceLabel(record.sourceLabel)
    : editorial
      ? resolveOriginalEditorialSourceLabel(record.sourceLabel)
      : cleanString(record.sourceLabel);
  const rejectMisleadingAttribution = originalFiction || editorial;
  const rawDescription = cleanString(description);
  const rawSocialCaption = cleanString(socialCaption);
  return {
    sourceType,
    sourceLabel,
    description: rejectMisleadingAttribution && hasMisleadingOriginalFictionAttribution(rawDescription)
      ? null
      : rawDescription,
    socialCaption: rejectMisleadingAttribution && hasMisleadingOriginalFictionAttribution(rawSocialCaption)
      ? null
      : rawSocialCaption,
  };
}
