const ARABIC_MARKS = /[\u064B-\u065F\u0670\u0640]/g;
const ALEF_VARIANTS = /[أإآٱ]/g;

/** Normalize Arabic/Latin route labels consistently across admin search surfaces. */
export function normalizeAdminSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ar")
    .replace(ARABIC_MARKS, "")
    .replace(ALEF_VARIANTS, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesAdminSearch(query: string, ...values: Array<string | null | undefined>): boolean {
  const normalizedQuery = normalizeAdminSearch(query);
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeAdminSearch(value ?? "").includes(normalizedQuery));
}
