export type OfflineHadithBookRecord = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  hadith_count: number | null;
};

export type OfflineHadithRecord = {
  book_id: string;
  hadith_number: string;
  text_ar: string;
  text_en: string | null;
  ref: string | null;
  published: true;
};

export type OfflineHadithSnapshot = {
  books: OfflineHadithBookRecord[];
  hadiths: OfflineHadithRecord[];
};

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate and intersect the committed offline book catalogue with the
 * published-only hadith snapshot. Hidden/unpublished rows are never restored.
 */
export function normalizeOfflineHadithSnapshot(
  booksPayload: unknown,
  hadithPayload: unknown,
): OfflineHadithSnapshot {
  if (!Array.isArray(booksPayload) || !Array.isArray(hadithPayload)) {
    throw new Error("Offline hadith snapshot must contain book and hadith arrays.");
  }

  const books = booksPayload
    .filter((value): value is RawRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    .map((row) => ({
      id: asString(row.id),
      slug: asString(row.slug),
      name_ar: asString(row.name_ar),
      name_en: asString(row.name_en) || null,
      hadith_count: Number.isFinite(Number(row.hadith_count)) ? Number(row.hadith_count) : null,
    }))
    .filter((book) => book.id && book.slug && book.name_ar);

  const bookIds = new Set(books.map((book) => book.id));
  const seen = new Set<string>();
  const hadiths = hadithPayload
    .filter((value): value is RawRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    .filter((row) => row.published === true)
    .map((row) => ({
      book_id: asString(row.book_id),
      hadith_number: asString(row.hadith_number),
      text_ar: asString(row.text_ar),
      text_en: asString(row.text_en) || null,
      ref: asString(row.ref) || null,
      published: true as const,
    }))
    .filter((row) => {
      if (!bookIds.has(row.book_id) || !row.hadith_number || !row.text_ar) return false;
      const key = row.book_id + ":" + row.hadith_number;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!books.length || !hadiths.length) {
    throw new Error("Offline hadith snapshot is incomplete; refusing to publish an empty fallback.");
  }

  return { books, hadiths };
}

export function createOfflineHadithSnapshotLoader(
  loadSnapshot: () => Promise<OfflineHadithSnapshot>,
) {
  let snapshotPromise: Promise<OfflineHadithSnapshot> | null = null;

  return async (): Promise<OfflineHadithSnapshot> => {
    if (!snapshotPromise) snapshotPromise = loadSnapshot();
    try {
      return await snapshotPromise;
    } catch (error) {
      snapshotPromise = null;
      throw error;
    }
  };
}

export function getOfflineHadithRowsForBook(
  snapshot: OfflineHadithSnapshot,
  slug: string,
): { book: OfflineHadithBookRecord; rows: OfflineHadithRecord[] } | null {
  const book = snapshot.books.find((item) => item.slug === slug);
  if (!book) return null;

  const rows = snapshot.hadiths
    .filter((row) => row.book_id === book.id && row.published === true)
    .sort((a, b) => {
      const left = Number(a.hadith_number);
      const right = Number(b.hadith_number);
      if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
        return left - right;
      }
      return a.hadith_number.localeCompare(b.hadith_number, "en", { numeric: true });
    });

  return rows.length ? { book, rows } : null;
}
