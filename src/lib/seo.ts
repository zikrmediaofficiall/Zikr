/**
 * SEO Optimization Utilities
 */

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

/**
 * Generate structured data for JSON-LD
 */
export function generateStructuredData(
  type: string,
  data: Record<string, unknown>
) {
  return {
    ...data,
    "@context": "https://schema.org",
    "@type": type,
  };
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbs(
  items: Array<{ name: string; url: string }>
) {
  return generateStructuredData("BreadcrumbList", {
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

/**
 * Generate article structured data
 */
export function generateArticleSchema(data: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}) {
  return generateStructuredData("Article", {
    headline: data.headline,
    description: data.description,
    image: data.image,
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    author: {
      "@type": "Person",
      name: data.author,
    },
    url: data.url,
  });
}

/**
 * Generate organization structured data
 */
export function generateOrganizationSchema(data: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}) {
  return generateStructuredData("Organization", {
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    sameAs: data.sameAs || [],
  });
}

/**
 * Generate FAQ structured data
 */
export function generateFAQSchema(
  items: Array<{ question: string; answer: string }>
) {
  return generateStructuredData("FAQPage", {
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}

/**
 * Optimize text for SEO
 */
export function optimizeTextForSEO(
  text: string,
  maxLength: number = 160
): string {
  const normalized = text.trim().replace(/\s+/gu, " ");
  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.trunc(maxLength)) : 160;
  const characters = Array.from(normalized);
  if (characters.length <= limit) return normalized;
  if (limit <= 3) return characters.slice(0, limit).join("");
  return `${characters.slice(0, limit - 3).join("").trimEnd()}...`;
}

/**
 * Generate slug from text
 */
export function generateSlug(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0640/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/[\s-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Check if text contains target keywords
 */
export function checkKeywordDensity(text: string, keyword: string): number {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const words = text.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
  if (!normalizedKeyword || words.length === 0) return 0;
  const keywordCount = words.filter((word) => word === normalizedKeyword).length;
  return (keywordCount / words.length) * 100;
}

/**
 * Generate meta description
 */
export function generateMetaDescription(text: string): string {
  return optimizeTextForSEO(text, 160);
}

/**
 * Generate meta keywords
 */
export function generateMetaKeywords(keywords: string[]): string {
  return keywords.slice(0, 10).join(", ");
}

/**
 * Check page SEO score (simple heuristic)
 */
export function calculateSEOScore(data: {
  title?: string;
  description?: string;
  keywords?: string[];
  hasH1?: boolean;
  hasStructuredData?: boolean;
  hasAltText?: boolean;
  hasMetaRobots?: boolean;
}): number {
  let score = 0;

  if (data.title && data.title.length > 30 && data.title.length < 60)
    score += 20;
  if (
    data.description &&
    data.description.length > 120 &&
    data.description.length < 160
  )
    score += 20;
  if (data.keywords && data.keywords.length > 0) score += 15;
  if (data.hasH1) score += 15;
  if (data.hasStructuredData) score += 15;
  if (data.hasAltText) score += 10;
  if (data.hasMetaRobots) score += 5;

  return Math.min(score, 100);
}
