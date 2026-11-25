import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import {
  MAX_QUOTES_PER_CONTENT,
  extractQuotes,
  quoteInCorpusWindow,
  quoteProbeWords,
  quoteVerificationProblem,
  type ExtractedQuote,
  type QuoteVerdict,
} from "./quote-verification";

// All-words match on the corpus's normalized search vector; exact containment is re-checked in code.
const wordsFilter = (words: string[]) => `fts(simple).${encodeURIComponent(words.join(" & "))}`;

async function verifyQuran(quote: ExtractedQuote): Promise<boolean> {
  const probe = quoteProbeWords(quote);
  if (!probe.length) return false;
    const candidates = await supabaseServerAdminRequest<Array<{ surah_id: number; ayah_number: number; text_simple: string | null }>>(
    `/rest/v1/quran_ayahs?select=surah_id,ayah_number,text_simple&searchable_normalized=${wordsFilter(probe)}&limit=50`,
    { method: "GET" },
  );
  for (const row of candidates) {
    const window = await supabaseServerAdminRequest<Array<{ text_simple: string | null }>>(
      `/rest/v1/quran_ayahs?select=text_simple&surah_id=eq.${row.surah_id}&ayah_number=gte.${row.ayah_number}&ayah_number=lte.${row.ayah_number + 3}&order=ayah_number.asc`,
      { method: "GET" },
    );
    if (quoteInCorpusWindow(quote, window.map((item) => item.text_simple ?? ""))) return true;
  }
  return false;
}

async function verifyHadith(quote: ExtractedQuote): Promise<boolean> {
  const probe = quoteProbeWords(quote);
  if (!probe.length) return false;
  const rows = await supabaseServerAdminRequest<Array<{ text_ar: string | null }>>(
    `/rest/v1/hadiths?select=text_ar&searchable_normalized=${wordsFilter(probe)}&limit=50`,
    { method: "GET" },
  );
  return rows.some((row) => quoteInCorpusWindow(quote, [row.text_ar ?? ""]));
}

/** Returns an Arabic message when a quoted Quran or hadith span does not match the corpus, else null. Throws when the corpus cannot be read. */
export async function checkContentQuotes(text: string): Promise<string | null> {
  const quotes = extractQuotes(text);
  if (quotes.length > MAX_QUOTES_PER_CONTENT) return quoteVerificationProblem([], quotes.length);
  const verdicts: QuoteVerdict[] = [];
  for (const quote of quotes) {
    verdicts.push({ quote, verified: quote.kind === "quran" ? await verifyQuran(quote) : await verifyHadith(quote) });
  }
  return quoteVerificationProblem(verdicts, quotes.length);
}
