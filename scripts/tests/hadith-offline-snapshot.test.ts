import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createOfflineHadithSnapshotLoader,
  getOfflineHadithRowsForBook,
  normalizeOfflineHadithSnapshot,
} from "../../src/features/hadith/services/offline-hadith-loader";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;
const booksPayload = readJson("public/offline-content/v1/hadith_books.json");
const hadithPayload = readJson("public/offline-content/v1/hadith.json");
const manifest = readJson("public/offline-content/v1/manifest.json") as {
  datasets?: { hadith?: { count?: number; source?: string; stale?: boolean } };
};
assert.ok(Array.isArray(booksPayload));
assert.ok(Array.isArray(hadithPayload));
assert.equal(
  hadithPayload.length,
  manifest.datasets?.hadith?.count,
  "the raw offline hadith corpus must match its committed manifest count",
);

const snapshot = normalizeOfflineHadithSnapshot(booksPayload, hadithPayload);
assert.equal(
  snapshot.hadiths.length,
  hadithPayload.length,
  "all current published offline hadith rows must map to a known book without duplicate book/number pairs",
);
assert.ok(snapshot.books.length >= 5, "the offline snapshot must contain the expected multi-book catalogue");
assert.ok(snapshot.hadiths.every(row => row.published === true && row.text_ar.length > 0));

const bukhari = getOfflineHadithRowsForBook(snapshot, "bukhari");
assert.ok(bukhari, "Sahih al-Bukhari must remain readable from the local snapshot");
assert.ok(bukhari.rows.length > 0);
assert.ok(bukhari.rows.every(row => row.book_id === bukhari.book.id && row.published));
for (let i = 1; i < bukhari.rows.length; i += 1) {
  assert.ok(
    Number(bukhari.rows[i - 1].hadith_number) <= Number(bukhari.rows[i].hadith_number),
    "offline book rows must be sorted by hadith number",
  );
}
assert.equal(getOfflineHadithRowsForBook(snapshot, "not-a-real-book"), null);

const bookId = "book-1";
const synthetic = normalizeOfflineHadithSnapshot(
  [{ id: bookId, slug: "test", name_ar: "كتاب اختباري", name_en: null, hadith_count: 2 }],
  [
    { book_id: bookId, hadith_number: "2", text_ar: "حديث ثان", published: true },
    { book_id: bookId, hadith_number: "1", text_ar: "حديث أول", published: true },
    { book_id: bookId, hadith_number: "3", text_ar: "حديث مخفي", published: false },
    { book_id: "unknown-book", hadith_number: "4", text_ar: "كتاب مجهول", published: true },
    { book_id: bookId, hadith_number: "1", text_ar: "نسخة مكررة", published: true },
  ],
);
assert.deepEqual(
  getOfflineHadithRowsForBook(synthetic, "test")?.rows.map(row => row.hadith_number),
  ["1", "2"],
  "hidden, orphaned, and duplicate rows must not enter the offline fallback",
);
assert.throws(
  () => normalizeOfflineHadithSnapshot([], []),
  /incomplete/,
  "an empty snapshot must fail closed",
);

let reads = 0;
const loadCached = createOfflineHadithSnapshotLoader(async () => {
  reads += 1;
  return snapshot;
});
const [first, second] = await Promise.all([loadCached(), loadCached()]);
assert.equal(first, second, "concurrent calls must share one validated offline snapshot");
assert.equal(reads, 1, "the large local corpus must be read and normalized once per process");

const service = readFileSync("src/features/hadith/services/hadith.ts", "utf8");
assert.match(service, /if \(dbBooks === null\)\s*\{\s*const offline = await getOfflineHadithBookPage/,
  "a failed database lookup must use the local published snapshot before the external provider");
assert.match(service, /if \(dbBooks === null\)\s*\{\s*const offline = await getOfflineHadithByNumber/,
  "a failed single-hadith lookup must use the local published snapshot");
assert.match(service, /const offlineMatches = await searchOfflineHadith\(q\)/,
  "hadith search must use the local corpus after an actual backend failure");
assert.match(service, /if \(!shouldFallbackToExternalHadith\(dbHadiths\)\)[\s\S]*?return dbHadiths\.map\(mapDbHadith\)/,
  "a successful empty published-only database search must remain authoritative");
assert.match(service, /readFile\([\s\S]*?offline-content[\s\S]*?hadith\.json/,
  "the fallback must read the committed offline content dataset");

console.log("Published offline hadith snapshot contract passed.");
