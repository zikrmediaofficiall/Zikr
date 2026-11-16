import { isKidsContentType } from "@/features/kids/services/kids-content-validation";

export function isKidsContentPubliclyVisible(item: { type?: unknown; metadata?: unknown }): boolean {
  // The public Kids library must not expose a story until a reviewer explicitly
  // approves its age suitability. Publication and active state remain DB/RLS gates.
  if (!isKidsContentType(item.type)) return false;
  if (item.type !== "story") return true;
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
  return metadata.age_appropriate === true;
}

export function buildKidsStoryAgeReviewPatch(
  existingMetadata: Record<string, unknown>,
  currentPublished: boolean,
  approved: boolean,
  updatedAt: string,
): {
  metadata: Record<string, unknown>;
  published: boolean;
  updated_at: string;
} {
  return {
    metadata: { ...existingMetadata, age_appropriate: approved },
    published: approved ? currentPublished : false,
    updated_at: updatedAt,
  };
}

export function normalizeKidsContentSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Static fallback content must obey the same explicit story age-review gate as
 * database content. Never manufacture an approval flag while preparing fallback.
 */
export function prepareKidsFallbackContent<T extends { slug: string; type?: unknown; metadata?: unknown }>(
  items: readonly T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const slug = normalizeKidsContentSlug(item.slug);
    if (!slug || seen.has(slug) || !isKidsContentPubliclyVisible(item)) return false;
    seen.add(slug);
    return true;
  });
}


const GENERIC_KIDS_ENGLISH_CONTENT = /^original educational content prepared for (?:zikr )?families\.?$/i;

/** Reject known seed placeholders so English pages never present editorial metadata as translated content. */
export function hasKidsEnglishContent(item: { title_en?: unknown; content_en?: unknown }): boolean {
  const title = typeof item.title_en === "string" ? item.title_en.trim() : "";
  const content = typeof item.content_en === "string" ? item.content_en.trim().replace(/\s+/g, " ") : "";
  return Boolean(title && content) && !GENERIC_KIDS_ENGLISH_CONTENT.test(content);
}

export function mergeKidsContentWithFallback<T extends { slug: string; type?: unknown; metadata?: unknown }>(
  databaseItems: readonly T[],
  fallbackItems: readonly T[],
  knownDatabaseSlugs: ReadonlySet<string>,
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const item of databaseItems) {
    const slug = normalizeKidsContentSlug(item.slug);
    if (!slug || seen.has(slug) || !isKidsContentPubliclyVisible(item)) continue;
    seen.add(slug);
    merged.push(item);
  }

  for (const item of fallbackItems) {
    if (!isKidsContentPubliclyVisible(item)) continue;
    const slug = normalizeKidsContentSlug(item.slug);
    if (!slug || seen.has(slug) || knownDatabaseSlugs.has(slug)) continue;
    seen.add(slug);
    merged.push(item);
  }

  return merged;
}

export function getFallbackKidsContentBySlug<T extends { slug: string; type?: unknown; metadata?: unknown }>(
  slug: string,
  fallbackItems: readonly T[],
  knownDatabaseSlugs: ReadonlySet<string>,
): T | null {
  const normalizedSlug = normalizeKidsContentSlug(slug);
  if (!normalizedSlug || knownDatabaseSlugs.has(normalizedSlug)) return null;
  return fallbackItems.find((item) =>
    isKidsContentPubliclyVisible(item) &&
    normalizeKidsContentSlug(item.slug) === normalizedSlug,
  ) ?? null;
}

/** Return a temporary-unavailable response only when both independent Kids lookups failed. */
export function shouldTreatKidsContentLookupAsUnavailable(
  publicResultStatus: "fulfilled" | "rejected",
  visibilityResultStatus: "fulfilled" | "rejected",
): boolean {
  return publicResultStatus === "rejected" && visibilityResultStatus === "rejected";
}
