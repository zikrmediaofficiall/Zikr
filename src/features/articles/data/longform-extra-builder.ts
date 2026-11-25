import type { ArticleReference, StaticArticle } from "@/features/articles/data/articles";

const publishedAt = "2026-11-25T00:00:00.000Z";

/** Quran reference: surah:ayah are checked against the Quran database counts by scripts/verify-article-sources.mjs. */
export function q(surah: number, ayah: number, label: string): ArticleReference {
  return { url: `https://quran.com/${surah}/${ayah}`, title_ar: `القرآن الكريم: ${label}`, source_type: "القرآن الكريم" };
}

/** Hadith reference on sunnah.com; each number was opened and matched to its chapter and wording before use. */
export function h(book: "bukhari" | "muslim", number: number, label: string): ArticleReference {
  const name = book === "bukhari" ? "صحيح البخاري" : "صحيح مسلم";
  return { url: `https://sunnah.com/${book}:${number}`, title_ar: `${name}، حديث ${number}: ${label}`, source_type: "السنة النبوية" };
}

export type ExtraSeed = {
  slug: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  tags: string[];
  category_id: "aqeedah" | "fiqh" | "history" | "tazkiyah";
  refs: ArticleReference[];
  content_ar: string;
};

export function extraArticle(seed: ExtraSeed): StaticArticle {
  return {
    id: `longform-${seed.slug}`,
    title: seed.title_ar,
    title_ar: seed.title_ar,
    title_en: seed.title_en,
    slug: seed.slug,
    summary: seed.summary_ar,
    summary_ar: seed.summary_ar,
    summary_en: seed.summary_en,
    content: seed.content_ar,
    content_ar: seed.content_ar,
    author: "فريق التحرير في ذِكر",
    featured_image_url: null,
    views: 0,
    created_at: publishedAt,
    tags: seed.tags,
    featured: true,
    category_id: seed.category_id,
    metadata: { editorial: true, reviewedAt: publishedAt, references: seed.refs },
  };
}
