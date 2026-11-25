/**
 * OMNIS P06-02: quoted Quran and hadith text must match the canonical corpus.
 * Quran quotes are the spans inside the ornate brackets; hadith quotes are the spans
 * inside guillemets. Matching ignores diacritics, tatweel, alef/ya variants and punctuation,
 * never the words themselves. Pure and deterministic; the corpus lookup lives in the service.
 */
export type QuoteKind = "quran" | "hadith";
export type ExtractedQuote = { kind: QuoteKind; text: string; normalized: string };

export function isQuoteVerificationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SOURCE_TEXT_CHECK_ENABLED === "true" || env.SOURCE_TEXT_CHECK_ENABLED === "1";
}

export function normalizeArabicForMatch(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const MAX_QUOTES_PER_CONTENT = 8;
export const MIN_QUOTE_WORDS = 2;

export function extractQuotes(text: string): ExtractedQuote[] {
  const out: ExtractedQuote[] = [];
  for (const [kind, re] of [["quran", /\uFD3F([^\uFD3E\uFD3F]+)\uFD3E/g], ["hadith", /\u00AB([^\u00AB\u00BB]+)\u00BB/g]] as const) {
    for (const match of text.matchAll(re)) {
      const normalized = normalizeArabicForMatch(match[1]);
      if (normalized.split(" ").filter(Boolean).length >= MIN_QUOTE_WORDS) out.push({ kind, text: match[1].trim(), normalized });
    }
  }
  return out;
}

/**
 * The corpus uses Uthmani spelling (dagger alef), quotes are usually written in standard spelling.
 * Comparison therefore drops alef letters on both sides. Altered, added or missing words still fail.
 */
export function skeleton(normalized: string): string {
  return normalized.replace(/\u0627/g, "");
}

/** Words without an alef, safe to use for the candidate lookup whatever spelling the quote uses. */
export function quoteProbeWords(quote: ExtractedQuote, max = 4): string[] {
  return quote.normalized.split(" ").filter((word) => word.length >= 2 && !word.includes("\u0627")).slice(0, max);
}

/** True when the quote is a contiguous run inside the corpus window (one row or consecutive rows). */
export function quoteInCorpusWindow(quote: ExtractedQuote, windowTexts: readonly string[]): boolean {
  const joined = windowTexts.map(normalizeArabicForMatch).join(" ");
  return skeleton(joined).includes(skeleton(quote.normalized));
}

export type QuoteVerdict = { quote: ExtractedQuote; verified: boolean };

export function quoteVerificationProblem(verdicts: readonly QuoteVerdict[], extractedCount: number): string | null {
  if (extractedCount > MAX_QUOTES_PER_CONTENT) return "عدد الاقتباسات كبير. قسّم المحتوى أو راجع الاقتباسات يدويًا قبل النشر.";
  const bad = verdicts.filter((v) => !v.verified);
  if (!bad.length) return null;
  const first = bad[0].quote;
  return `اقتباس ${first.kind === "quran" ? "قرآني" : "حديثي"} لا يطابق المصدر المعتمد: «${first.text.slice(0, 60)}». صحّح النص أو وثّقه قبل النشر.`;
}
