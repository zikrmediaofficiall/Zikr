import type { MetadataRoute } from "next";
import { getAllScholars } from "@/features/scholars/services/scholars";
import { getHadithBooks } from "@/features/hadith/services/hadith";
import { getStories } from "@/features/stories/services/stories";
import { getArticles } from "@/features/articles/services/articles";
import { getDuas } from "@/features/dua/services/dua";
import { getProphets } from "@/features/prophets/services/prophets";
import { getPublicContentLibrary } from "@/features/content-library/services/content-library";
import { getKidsContent } from "@/features/kids/services/kids-content";
import { getKidsGeneratedVideos } from "@/features/videos/services/videos";
import { surahs as fallbackSurahs } from "@/features/quran/data/fallback";
import { supabaseServerAnonRequest } from "@/lib/supabase/server";
import { appRoutes, isNoindexPath, siteConfig } from "@/lib/site";
import { filterIndexableSitemapRoutes, getSitemapShard, getSitemapShardCountForEntryCount } from "@/lib/seo/sitemap-shards";
import { PUBLIC_CONTENT_THRESHOLDS } from "@/lib/content-quality";
import type { Surah } from "@/features/quran/types/quran";
import type { Scholar } from "@/features/scholars/types/scholars";
import type { HadithBook } from "@/features/hadith/types/hadith";
import type { Story } from "@/features/stories/types/stories";
import type { Prophet } from "@/features/prophets/types/prophets";
import type { Article } from "@/features/articles/types/articles";
import type { Dua } from "@/features/dua/types/dua";

type SitemapEntry = MetadataRoute.Sitemap[number];
type SlugRow = { slug: string };

const MIN_INDEXABLE_EDITORIAL_CHARS = PUBLIC_CONTENT_THRESHOLDS.article;
const MIN_INDEXABLE_STORY_CHARS = PUBLIC_CONTENT_THRESHOLDS.story;

export const dynamic = "force-dynamic";

async function getPublishedSlugs(table: "prophets" | "battles" | "companions" | "conquests") {
  return supabaseServerAnonRequest<SlugRow[]>(`/rest/v1/${table}?select=slug&published=eq.true&order=slug.asc`).catch((error): SlugRow[] => {
    console.error(`[sitemap] ${table} fetch failed:`, error);
    return [];
  });
}

function siteConfigRoutes() {
  return appRoutes.filter(r => !isNoindexPath(r.path));
}

function route(path = "", options: Omit<SitemapEntry, "url">): SitemapEntry {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  return { url: `${baseUrl}${path}`, ...options };
}

function uniqueRoutes(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return Array.from(new Map(routes.map(entry => [entry.url, entry])).values());
}

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = siteConfigRoutes().map(appRoute => route(appRoute.path === "/" ? "" : appRoute.path, {
    lastModified: now,
    changeFrequency: appRoute.sitemap.changeFrequency,
    priority: appRoute.sitemap.priority,
  }));

  try {
    const [surahs, scholars, hadithBooks, stories, articles, prophets, battles, duas, companions, conquests, competitions, publicContent, kidsContentItems, kidsVideos] = await Promise.all([
      Promise.resolve(fallbackSurahs.map(surah => ({ number: surah.id, name: surah.nameAr, englishName: surah.nameEn, englishNameTranslation: "", numberOfAyahs: surah.ayahCount, revelationType: surah.revelationPlace === "meccan" ? "Meccan" : "Medinan" }) satisfies Surah)),
      getAllScholars().catch((error): Scholar[] => { console.error("[sitemap] Scholars fetch failed:", error); return []; }),
      getHadithBooks("ar").catch((error): HadithBook[] => { console.error("[sitemap] Hadith fetch failed:", error); return []; }),
      getStories(1000).catch((error): Story[] => { console.error("[sitemap] Stories fetch failed:", error); return []; }),
      getArticles(undefined, 1000, "ar").catch((): Article[] => []),
      getProphets().catch((): Prophet[] => []),
      getPublishedSlugs("battles"),
      getDuas(undefined, 1000, "ar").catch((): Dua[] => []),
      getPublishedSlugs("companions"),
      getPublishedSlugs("conquests"),
      supabaseServerAnonRequest<{ id: string }[]>("/rest/v1/competitions?select=id&published=eq.true&limit=1").catch(() => []),
      getPublicContentLibrary(1000).catch(() => []),
      getKidsContent("ar").catch(() => []),
      getKidsGeneratedVideos(100).catch((error) => { console.error("[sitemap] Kids videos fetch failed:", error); return []; }),
    ]);

    const dynamicRoutes: MetadataRoute.Sitemap = [
      ...surahs.map((surah: Surah) => route(`/quran/${surah.number}`, { lastModified: now, changeFrequency: "monthly", priority: 0.8 })),
      ...scholars.map((scholar: Scholar) => route(`/scholars/${scholar.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...hadithBooks.map((book: HadithBook) => route(`/hadith/${book.slug ?? book.id}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...stories.filter((story: Story) => (story.content?.trim().length ?? 0) >= MIN_INDEXABLE_STORY_CHARS).map((story: Story) => route(`/stories/${story.slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.7 })),
      ...articles
        .filter(article => (article.content?.trim().length ?? 0) >= MIN_INDEXABLE_EDITORIAL_CHARS)
        .map(article => route(`/articles/${article.slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.7 })),
      ...prophets.map((prophet: Prophet) => route(`/prophets/${prophet.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...duas.filter((dua: Dua) => (dua.textAr?.trim().length ?? 0) >= 80).map((dua: Dua) => route(`/dua/${dua.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...battles.map((battle: SlugRow) => route(`/battles/${battle.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...companions.map((companion: SlugRow) => route(`/companions/${companion.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...conquests.map((conquest: SlugRow) => route(`/conquests/${conquest.slug}`, { lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
      ...(competitions.length > 0 ? [route("/competitions", { lastModified: now, changeFrequency: "weekly", priority: 0.6 })] : []),
      ...publicContent
        .filter((item) => (item.body_ar?.trim().length ?? 0) >= 600)
        .map((item) => route(`/content/${item.slug}`, {
          lastModified: item.published_at ? new Date(item.published_at) : now,
          changeFrequency: "monthly",
          priority: 0.6,
        })),
      ...kidsContentItems
        .filter((item) => item.type === "story" && item.metadata?.age_appropriate === true &&
          (item.content_ar?.trim().length ?? 0) >= MIN_INDEXABLE_STORY_CHARS)
        .map((item) => route(`/kids/${item.slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.65 })),
      ...kidsVideos
        .filter((video) => typeof video.slug === "string" && video.slug.trim().length > 0)
        .map((video) => route(`/kids/videos/${encodeURIComponent(video.slug)}`, {
          lastModified: video.createdAt ? new Date(video.createdAt) : now,
          changeFrequency: "monthly",
          priority: 0.55,
        })),
    ];

    const safeEntries = filterIndexableSitemapRoutes(
      uniqueRoutes([...staticRoutes, ...dynamicRoutes]),
      siteConfig.url,
      isNoindexPath,
    );
    return safeEntries;
  } catch (error) {
    console.error("[sitemap] Error generating dynamic routes:", error);
    const fallbackEntries = uniqueRoutes(staticRoutes);
    return fallbackEntries;
  }
}

export async function getSitemapShardCount(): Promise<number> {
  const entries = await getSitemapEntries();
  return getSitemapShardCountForEntryCount(entries.length);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapShard(await getSitemapEntries(), 0);
}
