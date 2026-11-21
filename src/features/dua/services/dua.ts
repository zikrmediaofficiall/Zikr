import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  isSupabaseConfigured,
  supabaseServerAnonRequest,
} from "@/lib/supabase/server";

import type { DuaCategory, Dua } from "@/features/dua/types/dua";
import { resolveCanonicalPublished } from "@/lib/data/content-merge";
import { getDatabasePublicationState, getDatabasePublicationStates } from "@/lib/data/publication-visibility";
import { shouldSuppressOfflineFallback } from "@/lib/data/publication-visibility-contract";
import {
  FALLBACK_DUA_CATEGORIES,
  FALLBACK_DUAS,
} from "@/features/dua/data/fallback";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";
import { normalizeArabicSearchText } from "@/lib/search/arabic-normalization";

type DuaRow = Record<string, unknown>;

const VERIFIED_DUA_SOURCE_URLS: Record<string, string> = {
  "rabbana-atina": "https://quran.com/2/201",
  "rabbi-zidni-ilma": "https://quran.com/20/114",
  "rabbi-ishrah-li-sadri": "https://quran.com/20/25-28",
  "rabbana-la-tuzigh": "https://quran.com/3/8",
  "allahumma-innaka-afuw": "https://sunnah.com/tirmidhi:3513",
  "allahumma-a-inni-ala-dhikrik": "https://sunnah.com/abudawud:1522",
  "sayyid-al-istighfar": "https://sunnah.com/bukhari:6306",
  "rabbighfir-li-wa-liwalidayya": "https://quran.com/71/28",
  "hasbi-allahu": "https://quran.com/9/129",
  "rabbana-zalamna": "https://quran.com/7/23",
  "rabbana-taqabbal-minna": "https://quran.com/2/127",
  "rabbana-afrigh-alayna-sabran": "https://quran.com/2/250",
  "rabbi-inni-lima-anzalta": "https://quran.com/28/24",
  "rabbana-hab-lana": "https://quran.com/25/74",
  "rabbi-awzini": "https://quran.com/27/19",
  "rabbi-hab-li-min-ladunka": "https://quran.com/3/38",
  "rabbana-la-tuakhidhna": "https://quran.com/2/286",
  "rabbana-ghfir-lana": "https://quran.com/3/193",
};

let offlineDuasPromise: Promise<Dua[]> | null = null;

async function loadOfflineDuas(): Promise<Dua[]> {
  if (!offlineDuasPromise) {
    offlineDuasPromise = readFile(
      path.join(
        process.cwd(),
        "public",
        "offline-content",
        "v1",
        "duas.json",
      ),
      "utf8",
    ).then((raw) => {
      const rows = JSON.parse(raw) as DuaRow[];

      return rows
        .filter((row) => row.published === true)
        .map(mapDuaRow)
        .filter((dua) => dua.slug && dua.textAr);
    });
  }

  return offlineDuasPromise;
}

function mapDuaRow(row: DuaRow): Dua {
  return {
    id: String(row.id ?? ""),
    titleAr: String(row.title_ar ?? ""),
    titleEn:
      typeof row.title_en === "string" && row.title_en.length > 0
        ? row.title_en
        : "",
    slug: String(row.slug ?? ""),
    textAr: String(row.text_ar ?? ""),
    textEn: typeof row.text_en === "string" ? row.text_en : undefined,
    occasionAr:
      typeof row.occasion_ar === "string" ? row.occasion_ar : undefined,
    sourceAr:
      typeof row.source_ar === "string" ? row.source_ar : undefined,
    sourceUrl: VERIFIED_DUA_SOURCE_URLS[String(row.slug ?? "")],
    benefitsAr:
      typeof row.benefits_ar === "string" ? row.benefits_ar : undefined,
    categoryId:
      typeof row.category_id === "string" ? row.category_id : undefined,
    published: row.published === true,
  };
}

async function getOfflineOrFallbackDuas(): Promise<Dua[]> {
  try {
    const local = await loadOfflineDuas();
    if (local.length > 0) return local;
  } catch (error) {
    console.error("[dua] Offline dua catalogue unavailable:", error);
  }

  return FALLBACK_DUAS.map((dua) => ({
    ...dua,
    sourceUrl: dua.sourceUrl ?? VERIFIED_DUA_SOURCE_URLS[dua.slug],
  }));
}

export async function getDuaCategories(): Promise<DuaCategory[]> {
  if (!isSupabaseConfigured()) return FALLBACK_DUA_CATEGORIES;

  const rows = await supabaseServerAnonRequest<Array<Record<string, unknown>>>(
    "/rest/v1/dua_categories?select=id,name_ar,name_en,slug,icon&published=eq.true&order=name_ar.asc",
  ).catch((error) => {
    console.error("[dua] Failed to fetch dua categories:", error);
    return [];
  });

  if (rows.length === 0) return FALLBACK_DUA_CATEGORIES;

  const mapped = rows
    .map((row) => ({
      id: String(row.id ?? ""),
      nameAr: String(row.name_ar ?? ""),
      nameEn: String(row.name_en ?? ""),
      slug: String(row.slug ?? ""),
      icon: typeof row.icon === "string" ? row.icon : undefined,
    }))
    .filter((category) => category.slug);

  return Array.from(
    new Map(
      [...FALLBACK_DUA_CATEGORIES, ...mapped].map((category) => [
        category.slug,
        category,
      ]),
    ).values(),
  );
}

export async function getDuas(
  categoryId?: string,
  limit = 50,
  locale?: Locale,
): Promise<Dua[]> {
  const activeLocale = locale ?? await getRequestLocale();
  const safeLimit = Math.max(1, Math.min(1000, Math.trunc(limit)));
  const localDuas = await getOfflineOrFallbackDuas();
  const localeReady = (dua: Dua) =>
    activeLocale === "en"
      ? Boolean(dua.titleEn?.trim() && dua.textEn?.trim())
      : Boolean(dua.titleAr?.trim() && dua.textAr?.trim());

  const fallbackBase =
    categoryId && categoryId !== "all"
      ? localDuas.filter((dua) => dua.categoryId === categoryId)
      : localDuas;
  const fallback = fallbackBase.filter(localeReady);

  if (!isSupabaseConfigured()) return fallback.slice(0, safeLimit);

  let query =
    "/rest/v1/duas?select=id,title_ar,title_en,slug,text_ar,text_en,occasion_ar,source_ar,benefits_ar,category_id,published&published=eq.true";

  if (categoryId && categoryId !== "all") {
    query += `&category_id=eq.${encodeURIComponent(categoryId)}`;
  }

  query += `&limit=${safeLimit}`;

  let databaseLookupFailed = false;
  const rows = await supabaseServerAnonRequest<DuaRow[]>(query).catch(
    (error) => {
      databaseLookupFailed = true;
      console.error("[dua] Failed to fetch duas:", error);
      return [];
    },
  );

  if (rows.length === 0) {
    const source = databaseLookupFailed ? fallbackBase : FALLBACK_DUAS.filter(
      dua => !categoryId || categoryId === "all" || dua.categoryId === categoryId,
    );
    if (databaseLookupFailed) return source.filter(localeReady).slice(0, safeLimit);

    const publicationStates = await getDatabasePublicationStates(
      "duas",
      source.map((dua) => dua.slug),
    );
    return source
      .filter((dua) =>
        !shouldSuppressOfflineFallback(publicationStates.get(dua.slug) ?? "unknown"),
      )
      .filter(localeReady)
      .slice(0, safeLimit);
  }

  const mapped = rows
    .map(mapDuaRow)
    .filter((dua) => dua.slug && localeReady(dua));

  return resolveCanonicalPublished(mapped, fallback).slice(0, safeLimit);
}

export async function searchDuas(query: string, locale: Locale = "ar"): Promise<Dua[]> {
  let databaseLookupFailed = false;
  const cleanQuery = query.trim().slice(0, 100);
  const normalizedQuery = normalizeArabicSearchText(cleanQuery);
  if (!normalizedQuery) return [];

  if (isSupabaseConfigured()) {
    try {
      const rows = await supabaseServerAnonRequest<DuaRow[]>(
        `/rest/v1/duas?select=id,title_ar,title_en,slug,text_ar,text_en,occasion_ar,source_ar,benefits_ar,category_id,published&published=eq.true&searchable_normalized=plfts(simple).${encodeURIComponent(normalizedQuery)}&limit=6`,
        { timeoutMs: 8000, retries: 1, cache: "no-store" },
      );
      const matches = rows.map(mapDuaRow).filter((dua) =>
        dua.slug && (locale === "en"
          ? Boolean(dua.titleEn?.trim() && dua.textEn?.trim())
          : Boolean(dua.titleAr?.trim() && dua.textAr?.trim())),
      );
      if (matches.length) return matches;
      const fallbackMatches = FALLBACK_DUAS.filter((dua) =>
        [dua.titleAr, dua.textAr, dua.titleEn ?? "", dua.textEn ?? "", dua.occasionAr ?? "", dua.sourceAr ?? "", dua.benefitsAr ?? ""]
          .some((value) => normalizeArabicSearchText(value).includes(normalizedQuery)),
      );
      const publicationStates = await getDatabasePublicationStates(
        "duas",
        fallbackMatches.map((dua) => dua.slug),
      );
      return fallbackMatches
        .filter((dua) =>
          !shouldSuppressOfflineFallback(publicationStates.get(dua.slug) ?? "unknown"),
        )
        .slice(0, 6);
    } catch (error) {
      databaseLookupFailed = true;
      console.error("[dua] Indexed search failed; using bounded fallback:", error);
    }
  }

  const fallbackSource = !isSupabaseConfigured() || databaseLookupFailed
    ? await getOfflineOrFallbackDuas()
    : FALLBACK_DUAS;
  return fallbackSource.filter((dua) =>
    [dua.titleAr, dua.textAr, dua.titleEn ?? "", dua.textEn ?? "", dua.occasionAr ?? "", dua.sourceAr ?? "", dua.benefitsAr ?? ""]
      .some((value) => normalizeArabicSearchText(value).includes(normalizedQuery)),
  ).slice(0, 6);
}

function resolveDuaLocale(dua: Dua | null, requestedLocale: Locale): Dua | null {
  if (!dua) return null;
  if (
    requestedLocale === "en" &&
    dua.titleEn.trim() &&
    dua.textEn?.trim()
  ) {
    return { ...dua, contentLocale: "en" };
  }
  if (dua.titleAr.trim() && dua.textAr.trim()) {
    return { ...dua, contentLocale: "ar" };
  }
  return null;
}

export async function getDuaBySlug(slug: string, locale?: Locale): Promise<Dua | null> {
  const activeLocale = locale ?? await getRequestLocale();
  const cleanSlug = slug?.trim() ?? "";
  if (!cleanSlug) return null;

  const localDuas = await getOfflineOrFallbackDuas();
  const localMatch = localDuas.find(dua => dua.slug === cleanSlug) ?? null;

  if (!isSupabaseConfigured()) {
    return resolveDuaLocale(localMatch, activeLocale);
  }

  const safeSlug = encodeURIComponent(cleanSlug);
  let databaseLookupFailed = false;
  const rows = await supabaseServerAnonRequest<DuaRow[]>(
    `/rest/v1/duas?select=id,title_ar,title_en,slug,text_ar,text_en,occasion_ar,source_ar,benefits_ar,category_id,published&slug=eq.${safeSlug}&published=eq.true&limit=1`,
    { timeoutMs: 8000, retries: 1, cache: "no-store" },
  ).catch(error => {
    databaseLookupFailed = true;
    console.error("[dua] Failed to fetch dua by slug:", error);
    return [];
  });

  if (!rows.length && !databaseLookupFailed && localMatch) {
    const publicationState = await getDatabasePublicationState("duas", cleanSlug);
    if (shouldSuppressOfflineFallback(publicationState)) return null;
  }

  if (!rows.length) return resolveDuaLocale(localMatch, activeLocale);

  return resolveDuaLocale(mapDuaRow(rows[0]), activeLocale) ?? resolveDuaLocale(localMatch, activeLocale);
}
