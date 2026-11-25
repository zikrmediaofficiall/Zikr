export const PUBLIC_CONTENT_THRESHOLDS = {
  article: 1800,
  story: 900,
  biography: 1200,
  dua: 80,
  duaIndexable: 400,
} as const;

/** A dua page is indexable only when its own text plus occasion and benefits give enough original context. */
export function isIndexableDuaDepth(parts: Array<unknown>): boolean {
  return parts.map(normalizedText).join(" ").trim().length >= PUBLIC_CONTENT_THRESHOLDS.duaIndexable;
}

export function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function hasMinimumEditorialDepth(value: unknown, minimum: number): boolean {
  return normalizedText(value).length >= minimum;
}

export function estimateReadingMinutes(value: unknown, wordsPerMinute = 180): number {
  const words = normalizedText(value).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function splitEditorialParagraphs(value: unknown): string[] {
  return (typeof value === "string" ? value : "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
