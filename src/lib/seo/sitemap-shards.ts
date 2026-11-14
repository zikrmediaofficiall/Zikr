export const SITEMAP_PAGE_SIZE = 45_000;

export function getSitemapShardCountForEntryCount(entryCount: number): number {
  if (!Number.isSafeInteger(entryCount) || entryCount < 0) {
    throw new RangeError("Sitemap entry count must be a non-negative safe integer.");
  }
  return Math.max(1, Math.ceil(entryCount / SITEMAP_PAGE_SIZE));
}

export function getSitemapShard<T>(entries: readonly T[], shardId: number): T[] {
  if (!Number.isSafeInteger(shardId) || shardId < 0) return [];
  const start = shardId * SITEMAP_PAGE_SIZE;
  return entries.slice(start, start + SITEMAP_PAGE_SIZE);
}

export function filterIndexableSitemapRoutes<T extends { url: string }>(
  entries: readonly T[],
  baseUrl: string,
  isNoindexPath: (pathname: string) => boolean,
): T[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  return entries.filter((entry) => {
    try {
      const candidate = new URL(entry.url, base);
      return candidate.origin === base.origin && !isNoindexPath(candidate.pathname);
    } catch {
      return false;
    }
  });
}
