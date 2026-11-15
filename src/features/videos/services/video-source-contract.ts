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

function isOriginalKidsFiction(content: Record<string, unknown>): boolean {
  return content.sourceType === "original_kids_fiction" ||
    (content.audience === "kids" && content.aiMode === "original_kids_story");
}

function hasMisleadingOriginalFictionAttribution(value: string | null): boolean {
  if (!value) return false;
  return /(?:قصة\s+موثقة|موثقة\s+في\s+مكتبة|إحالة\s+إلى\s+مصدرها|مصدرها\s+الأساسي|(?:^|\n)\s*المصدر\s*[:：])/u.test(value);
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
  return sources.filter((source) =>
    source.audience !== "kids" &&
    source.generationMode !== "free_deterministic_story_factory" &&
    source.sourceType !== "original_kids_fiction" &&
    !source.id.toLowerCase().startsWith("kids-series:")
  );
}

/** Keep original fiction/editorial copy from claiming an external source URL. */
export function resolveVideoSourceDisclosureLine(content: unknown, fallbackSourceUrl: string): string {
  const record = asRecord(content);
  const sourceType = cleanString(record.sourceType);
  const sourceLabel = cleanString(record.sourceLabel);
  if (isOriginalKidsFiction(record)) return sourceLabel ?? ORIGINAL_KIDS_FICTION_DISCLOSURE;
  if (sourceType === "editorial") return sourceLabel ?? ORIGINAL_EDITORIAL_DISCLOSURE;
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
  const sourceType = cleanString(record.sourceType);
  const originalFiction = isOriginalKidsFiction(record);
  const sourceLabel = cleanString(record.sourceLabel) ??
    (originalFiction ? ORIGINAL_KIDS_FICTION_DISCLOSURE : null);
  const rawDescription = cleanString(description);
  const rawSocialCaption = cleanString(socialCaption);
  return {
    sourceType,
    sourceLabel,
    description: originalFiction && hasMisleadingOriginalFictionAttribution(rawDescription)
      ? null
      : rawDescription,
    socialCaption: originalFiction && hasMisleadingOriginalFictionAttribution(rawSocialCaption)
      ? null
      : rawSocialCaption,
  };
}
