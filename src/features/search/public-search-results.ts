export type PublicSearchType =
  | "surah"
  | "hadith"
  | "dua"
  | "story"
  | "article"
  | "content"
  | "prophet"
  | "companion"
  | "scholar";

export type PublicSearchResult = {
  id: string;
  type: PublicSearchType;
  labelAr: string;
  title: string;
  subtitle: string;
  href: string;
};

const PUBLIC_SEARCH_TYPES = new Set<PublicSearchType>([
  "surah",
  "hadith",
  "dua",
  "story",
  "article",
  "content",
  "prophet",
  "companion",
  "scholar",
]);

export function mapPublicSearchRows(rows: unknown[]): PublicSearchResult[] {
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];

    const row = value as Record<string, unknown>;
    const id = row.id;
    const type = row.type;
    const title = row.title;
    const href = row.href;

    if (
      typeof id !== "string" ||
      typeof type !== "string" ||
      !PUBLIC_SEARCH_TYPES.has(type as PublicSearchType) ||
      typeof title !== "string" ||
      typeof href !== "string" ||
      !href.startsWith("/") ||
      href.startsWith("//")
    ) {
      return [];
    }

    return [{
      id,
      type: type as PublicSearchType,
      labelAr: typeof row.label_ar === "string" ? row.label_ar : "",
      title,
      subtitle: typeof row.subtitle === "string" ? row.subtitle : "",
      href,
    }];
  });
}
