import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldFallbackToExternalHadith } from "../../src/features/hadith/services/database-fallback-policy";

assert.equal(
  shouldFallbackToExternalHadith(null),
  true,
  "external data may be used when the database lookup itself failed",
);
assert.equal(
  shouldFallbackToExternalHadith([]),
  false,
  "a successful empty published-only query must remain authoritative",
);
assert.equal(
  shouldFallbackToExternalHadith([{ hadith_number: "1", published: true }]),
  false,
  "published database rows must remain authoritative",
);

const service = readFileSync("src/features/hadith/services/hadith.ts", "utf8");
assert.equal(
  (service.match(/shouldFallbackToExternalHadith\(dbHadiths\)/g) ?? []).length,
  3,
  "book pages, single-hadith reads, and search must all distinguish empty results from database errors",
);
assert.match(service, /published=eq\.true/);
assert.match(service, /if \(!shouldFallbackToExternalHadith\(dbHadiths\)\) \{\s*if \(!dbHadiths\[0\]\) return null;/);

console.log("Hadith publication-aware external fallback contract passed.");
