/**
 * Growth call to action for generated videos. Own-site and own-app only, never
 * third-party ads. Child-directed videos never get an external CTA or link.
 */
function stableIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

export function displayHost(siteUrl: string | undefined | null): string | null {
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    return url.protocol === "https:" ? url.host : null;
  } catch {
    return null;
  }
}

/** 0 keeps the classic "follow" CTA; 1 and 2 name the app and the site. */
export function videoCtaVariant(seed: string, siteUrl: string | undefined | null): 0 | 1 | 2 {
  if (!displayHost(siteUrl)) return 0;
  return stableIndex(seed + ":cta", 3) as 0 | 1 | 2;
}

export function growthOverlayCta(input: { seed: string; audience?: unknown; siteUrl?: string | null }): string | null {
  if (input.audience === "kids") return null;
  const host = displayHost(input.siteUrl);
  if (!host) return null;
  switch (videoCtaVariant(input.seed, input.siteUrl)) {
    case 1: return `حمّل تطبيق ذِكر لأندرويد • ${host}`;
    case 2: return `المزيد من المحتوى الموثّق على ${host}`;
    default: return null;
  }
}

/** Caption line with a link to our own site, for general-audience videos only. */
export function captionSiteLine(input: { audienceResolution: { ok: boolean; audience?: unknown }; siteUrl?: string | null }): string | null {
  if (!input.audienceResolution.ok || input.audienceResolution.audience !== "general") return null;
  const host = displayHost(input.siteUrl);
  return host ? `موقع ذِكر وتطبيق أندرويد: https://${host}` : null;
}
