import { assertCanonicalSupabaseProjectUrl } from "./lib/canonical-supabase-project.mjs";

const rawSupabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const SUPABASE_REQUEST_TIMEOUT_MS = 15_000;
const HADITH_API_TIMEOUT_MS = 10_000;

const apiBase = (
  process.env.HADITH_API_BASE_URL ?? "https://ummahapi.com/api/hadith"
).replace(/\/$/, "");

function parseBatchSize(raw: string | undefined): number {
  const value = raw?.trim() ? Number(raw) : 50;
  if (!Number.isInteger(value)) {
    throw new Error(
      "HADITH_TRANSLATION_BATCH_SIZE must be a whole number between 1 and 100."
    );
  }
  return Math.max(1, Math.min(100, value));
}

const batchSize = parseBatchSize(process.env.HADITH_TRANSLATION_BATCH_SIZE);

if (!rawSupabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}
const supabaseUrl = assertCanonicalSupabaseProjectUrl(rawSupabaseUrl);

type BookRow = { id: string; slug: string; name_en: string | null };
type HadithRow = {
  hadith_number: string;
  text_ar: string;
  text_en: string | null;
  book_id: string;
  ref: string | null;
};
type UmmahResponse = {
  success?: boolean;
  data?: {
    hadith_english?: string;
    english?: string;
    text_en?: string;
  };
};

async function supabase<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey!,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

const LIKE_UNSAFE = /[*,()%_\\"]/;

// Longest safe leading/trailing piece (max 150 chars) that contains no PostgREST/LIKE special character.
function safePrefix(value: string): string {
  const head = value.slice(0, 150);
  const bad = head.search(LIKE_UNSAFE);
  return bad === -1 ? head : head.slice(0, bad);
}
function safeSuffix(value: string): string {
  const tail = value.slice(-150);
  for (let i = tail.length - 1; i >= 0; i -= 1) if (LIKE_UNSAFE.test(tail[i])) return tail.slice(i + 1);
  return tail;
}

async function fetchEnglish(
  bookSlug: string,
  number: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBase}/${encodeURIComponent(bookSlug)}/${encodeURIComponent(number)}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HADITH_API_TIMEOUT_MS),
    }
  );
  if (response.status === 404 || response.status === 204) return null;
  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error(`Hadith API ${response.status}: ${details || "request failed"}`);
  }
  const payload = (await response.json()) as UmmahResponse;
  if (!payload.success || !payload.data) return null;
  const text =
    payload.data.hadith_english ??
    payload.data.english ??
    payload.data.text_en ??
    "";
  return text.trim() || null;
}

async function main() {
  const books = await supabase<BookRow[]>(
    "/rest/v1/hadith_books?select=id,slug,name_en&order=slug.asc"
  );
  const bookById = new Map(books.map(book => [book.id, book]));

  const rows = await supabase<HadithRow[]>(
    "/rest/v1/hadiths?select=hadith_number,text_ar,text_en,book_id,ref&published=eq.true&or=(text_en.is.null,text_en.eq.)&order=book_id.asc,hadith_number.asc&limit=" +
      batchSize
  );

  console.log(`Found ${rows.length} published Hadith records missing English.`);
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    const book = bookById.get(row.book_id);
    if (!book?.slug || !row.text_ar?.trim()) continue;

    try {
      const english = await fetchEnglish(book.slug, row.hadith_number);
      if (!english) {
        console.warn(
          `No English source returned for ${book.slug}/${row.hadith_number}`
        );
        continue;
      }

      // Very long Arabic texts overflow the request URL limit (Supabase 400), so those are revalidated by
      // their first and last 150 characters instead of the whole text.
      const exactArabic = encodeURIComponent(row.text_ar).length <= 1200;
      const arabicFilter = exactArabic
        ? `&text_ar=eq.${encodeURIComponent(row.text_ar)}`
        : `&and=(${["text_ar.like." + safePrefix(row.text_ar) + "*", "text_ar.like.*" + safeSuffix(row.text_ar)].map(encodeURIComponent).join(",")})`;
      const updatedRows = await supabase<Array<{ hadith_number: string }>>(
        exactArabic
          ? `/rest/v1/hadiths?book_id=eq.${encodeURIComponent(row.book_id)}&hadith_number=eq.${encodeURIComponent(row.hadith_number)}&published=eq.true&text_ar=eq.${encodeURIComponent(row.text_ar)}&or=(text_en.is.null,text_en.eq.)`
          : `/rest/v1/hadiths?book_id=eq.${encodeURIComponent(row.book_id)}&hadith_number=eq.${encodeURIComponent(row.hadith_number)}&published=eq.true${arabicFilter}&or=(text_en.is.null,text_en.eq.)`,
        {
          method: "PATCH",
          body: JSON.stringify({
            text_en: english,
          }),
        }
      );
      if (!updatedRows.length) {
        console.log(
          `Skipped ${book.slug}/${row.hadith_number}; an English value was added while the external source was fetched.`
        );
        continue;
      }
      synced += 1;
      console.log(`Synced ${book.slug}/${row.hadith_number}`);
    } catch (error) {
      failed += 1;
      console.error(
        `Hadith sync failed for ${book.slug}/${row.hadith_number}:`,
        error
      );
    }
  }

  console.log(`Hadith English sync complete: ${synced}/${rows.length} synced.`);
  if (failed > 0) {
    throw new Error(
      `${failed} Hadith record(s) failed to sync; inspect the logged item errors before retrying.`
    );
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
