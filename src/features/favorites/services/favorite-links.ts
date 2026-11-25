export const FAVORITE_ITEM_TYPES = ["quran", "hadith", "story", "scholar", "dua"] as const;

export type FavoriteItemType = (typeof FAVORITE_ITEM_TYPES)[number];

export function isFavoriteItemType(value: unknown): value is FavoriteItemType {
  return typeof value === "string" && (FAVORITE_ITEM_TYPES as readonly string[]).includes(value);
}

function stripTypePrefix(type: string, ref: string): string {
  const prefix = type + ":";
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : ref;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export function getFavoriteHref(type: string, ref: string): string {
  const cleanRef = stripTypePrefix(type, ref.trim()).trim();
  const [first, second] = cleanRef.split(":");

  switch (type) {
    case "quran":
      if (!first) return "/quran";
      return second
        ? "/quran/" + encodeSegment(first) + "/" + encodeSegment(second)
        : "/quran/" + encodeSegment(first);
    case "hadith":
      if (!first) return "/hadith";
      return second
        ? "/hadith/" + encodeSegment(first) + "/" + encodeSegment(second)
        : "/hadith/" + encodeSegment(first);
    case "story":
      return first ? "/stories/" + encodeSegment(cleanRef) : "/stories";
    case "scholar":
      return first ? "/scholars/" + encodeSegment(cleanRef) : "/scholars";
    case "dua":
      return first ? "/dua/" + encodeSegment(cleanRef) : "/dua";
    // Retained for legacy URL resolution only; these are not members of the database enum.
    case "article":
      return first ? "/articles/" + encodeSegment(cleanRef) : "/articles";
    case "video":
      return first ? "/videos/" + encodeSegment(cleanRef) : "/videos";
    default:
      return "/favorites";
  }
}


const FAVORITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accept only canonical PostgreSQL UUID text for favorites.id. */
export function isFavoriteId(value: unknown): value is string {
  return typeof value === "string" && FAVORITE_ID_PATTERN.test(value);
}
