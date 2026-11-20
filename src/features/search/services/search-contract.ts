export const PUBLIC_SEARCH_RESULT_TYPES = [
  "surah",
  "ayah",
  "hadith",
  "dua",
  "story",
  "article",
  "content",
  "prophet",
  "companion",
  "scholar",
] as const;

export type PublicSearchResultType = (typeof PUBLIC_SEARCH_RESULT_TYPES)[number];

export function isPublicSearchResultType(value: unknown): value is PublicSearchResultType {
  return (
    typeof value === "string" &&
    (PUBLIC_SEARCH_RESULT_TYPES as readonly string[]).includes(value)
  );
}
