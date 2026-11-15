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
    case "article":
      return first ? "/articles/" + encodeSegment(cleanRef) : "/articles";
    case "video":
      return first ? "/videos/" + encodeSegment(cleanRef) : "/videos";
    default:
      return "/favorites";
  }
}
