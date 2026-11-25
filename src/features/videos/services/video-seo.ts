/**
 * Discoverability helpers for YouTube metadata. Pure and deterministic.
 * Only generic topic words are added; nothing here touches source text,
 * attribution or religious claims.
 */
const CATEGORY_TERMS: Record<string, { hashtags: string[]; tags: string[] }> = {
  quran: { hashtags: ["#القرآن_الكريم", "#تدبر", "#آيات"], tags: ["القرآن الكريم", "تلاوة", "تدبر القرآن", "quran", "quran recitation"] },
  hadith: { hashtags: ["#حديث", "#السنة_النبوية", "#أحاديث_نبوية"], tags: ["حديث شريف", "السنة النبوية", "أحاديث نبوية", "hadith", "sunnah"] },
  dua: { hashtags: ["#دعاء", "#أدعية", "#ادعية_مستجابة"], tags: ["دعاء", "أدعية", "دعاء اليوم", "dua", "islamic dua"] },
  adhkar: { hashtags: ["#أذكار", "#ذكر_الله", "#أذكار_اليوم"], tags: ["أذكار", "أذكار الصباح والمساء", "ذكر الله", "adhkar", "dhikr"] },
  story: { hashtags: ["#قصص_إسلامية", "#قصة", "#عبرة"], tags: ["قصص إسلامية", "قصة وعبرة", "قصص الأنبياء", "islamic stories"] },
};
const BASE_TAGS = ["zikr", "ذكر", "islamic", "تعلم"];
const MAX_TAG_CHARS = 450; // YouTube allows 500 combined; keep headroom.

export function resolveSeoTerms(category: string, audience?: unknown) {
  const terms = audience === "kids" ? undefined : CATEGORY_TERMS[category];
  const hashtags = ["#ذكر", ...(terms?.hashtags ?? ["#تدبر", "#اسلاميات"])].slice(0, 4);
  const tags: string[] = [];
  let used = 0;
  for (const tag of [...(terms?.tags ?? []), ...BASE_TAGS]) {
    if (tags.includes(tag)) continue;
    if (used + tag.length + 1 > MAX_TAG_CHARS) break;
    tags.push(tag);
    used += tag.length + 1;
  }
  return { hashtags, tags };
}

/** Trims to a word boundary so titles never end mid-word, and adds an ellipsis only when cut. */
export function fitTitle(title: string, max: number): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

// Opening phrases for social titles. The first entry of each list is the long-standing
// phrase; the others are alternates for A/B comparison. None makes a reward, ruling
// or attribution claim, so the source text stays the only religious content.
const TITLE_HOOKS: Record<string, string[]> = {
  quran: ["آية قصيرة تستحق دقيقة من التدبر", "دقيقة مع آية من كتاب الله", "هل توقفت عند معنى هذه الآية؟"],
  hadith: ["رسالة نحتاج أن نتذكرها اليوم", "حديث قصير بمعنى كبير", "هل تعرف هذا الحديث؟"],
  dua: ["ردّد هذا الدعاء بقلب حاضر", "دعاء قصير احفظه اليوم", "هل حفظت هذا الدعاء؟"],
  adhkar: ["اجعل هذه الدقيقة نصيبك من الذكر", "ذكر قصير في يومك", "هل ذكرت الله اليوم؟"],
  story: ["قصة قصيرة بمعنى يبقى معك", "قصة وعبرة في دقيقة", "هل سمعت هذه القصة من قبل؟"],
};
const DEFAULT_TITLE_HOOKS = ["خذ دقيقة هادئة مع ذِكر", "دقيقة هادئة مع ذِكر", "هل جربت دقيقة هدوء اليوم؟"];

function stableIndex(seed: string, size: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

export function listTitleHooks(category: string): string[] {
  return TITLE_HOOKS[category] ?? DEFAULT_TITLE_HOOKS;
}

/** Deterministic per request id, so a retry keeps the same title and results can be compared later. */
export function pickTitleHook(category: string, seed: string): string {
  const hooks = listTitleHooks(category);
  return hooks[stableIndex(`${category}:${seed}`, hooks.length)];
}
