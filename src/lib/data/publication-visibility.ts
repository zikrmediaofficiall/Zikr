import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import type { DatabasePublicationState, PublicContentTable } from "./publication-visibility-contract";

const CACHE_TTL_MS = 30_000;
const UNKNOWN_CACHE_TTL_MS = 5_000;
const BATCH_LOOKUP_SIZE = 40;
type CacheEntry = { state: DatabasePublicationState; expiresAt: number };
const publicationStateCache = new Map<string, CacheEntry>();
const inFlightLookups = new Map<string, Promise<DatabasePublicationState>>();

/**
 * Resolve an authoritative publication state for a known offline/static slug.
 * Callers must first confirm that a fallback record exists; the bounded cache
 * and in-flight map prevent repeated public misses from amplifying service-role reads.
 */
export async function getDatabasePublicationState(
  table: PublicContentTable,
  slug: string,
): Promise<DatabasePublicationState> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return "missing";

  const cacheKey = table + ":" + cleanSlug;
  const cached = publicationStateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.state;
  const pending = inFlightLookups.get(cacheKey);
  if (pending) return pending;

  const lookup = (async (): Promise<DatabasePublicationState> => {
    try {
      const rows = await supabaseServerAdminRequest<Array<{ published: boolean | null }>>(
        `/rest/v1/${table}?select=published&slug=eq.${encodeURIComponent(cleanSlug)}&limit=1`,
        { cache: "no-store", timeoutMs: 5000, retries: 0 },
      );
      if (!rows.length) return "missing";
      return rows[0].published === true ? "published" : "unpublished";
    } catch (error) {
      console.error(`[publication-visibility] Failed to verify ${table} slug:`, error);
      return "unknown";
    }
  })();

  inFlightLookups.set(cacheKey, lookup);
  try {
    const state = await lookup;
    const ttl = state === "unknown" ? UNKNOWN_CACHE_TTL_MS : CACHE_TTL_MS;
    publicationStateCache.set(cacheKey, { state, expiresAt: Date.now() + ttl });
    return state;
  } finally {
    inFlightLookups.delete(cacheKey);
  }
}

/**
 * Resolve a bounded set of known fallback slugs with one service-role query per
 * batch. This keeps list/search fallbacks consistent with detail-route
 * publication checks without issuing one request per item.
 */
export async function getDatabasePublicationStates(
  table: PublicContentTable,
  slugs: string[],
): Promise<Map<string, DatabasePublicationState>> {
  const cleanSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  const states = new Map<string, DatabasePublicationState>();
  const unresolved: string[] = [];
  const pendingReads: Promise<void>[] = [];

  for (const slug of cleanSlugs) {
    const cacheKey = table + ":" + slug;
    const cached = publicationStateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      states.set(slug, cached.state);
      continue;
    }

    const pending = inFlightLookups.get(cacheKey);
    if (pending) {
      pendingReads.push(pending.then((state) => {
        states.set(slug, state);
      }));
    } else {
      unresolved.push(slug);
    }
  }

  await Promise.all(pendingReads);

  for (let offset = 0; offset < unresolved.length; offset += BATCH_LOOKUP_SIZE) {
    const batch = unresolved.slice(offset, offset + BATCH_LOOKUP_SIZE);
    const values = batch
      .map((slug) => `"${slug.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",");
    const filter = `in.(${values})`;
    const lookup = (async () => {
      try {
        const rows = await supabaseServerAdminRequest<
          Array<{ slug: string; published: boolean | null }>
        >(
          `/rest/v1/${table}?select=slug,published&slug=${encodeURIComponent(filter)}`,
          { cache: "no-store", timeoutMs: 5000, retries: 0 },
        );
        const bySlug = new Map<string, DatabasePublicationState>();
        for (const row of rows) {
          if (typeof row.slug !== "string") continue;
          bySlug.set(row.slug, row.published === true ? "published" : "unpublished");
        }
        return new Map(
          batch.map((slug) => [slug, bySlug.get(slug) ?? "missing"] as const),
        );
      } catch (error) {
        console.error(
          `[publication-visibility] Failed to verify ${table} fallback slugs:`,
          error,
        );
        return new Map(
          batch.map((slug) => [slug, "unknown"] as const),
        );
      }
    })();

    const pendingBySlug = new Map<string, Promise<DatabasePublicationState>>();
    for (const slug of batch) {
      const pending = lookup.then((batchStates) => batchStates.get(slug) ?? "unknown");
      pendingBySlug.set(slug, pending);
      inFlightLookups.set(table + ":" + slug, pending);
    }

    const batchStates = await lookup;
    for (const slug of batch) {
      const state = batchStates.get(slug) ?? "unknown";
      const ttl = state === "unknown" ? UNKNOWN_CACHE_TTL_MS : CACHE_TTL_MS;
      const cacheKey = table + ":" + slug;
      publicationStateCache.set(cacheKey, { state, expiresAt: Date.now() + ttl });
      states.set(slug, state);
      if (inFlightLookups.get(cacheKey) === pendingBySlug.get(slug)) {
        inFlightLookups.delete(cacheKey);
      }
    }
  }

  return states;
}
