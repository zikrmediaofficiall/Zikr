import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stats = readFileSync("src/features/content/services/stats.ts", "utf8");
const hadithService = readFileSync("src/features/hadith/services/hadith.ts", "utf8");

assert.match(
  stats,
  /const PUBLISHED_TABLES = new Set\([\s\S]*?"hadiths"/,
  "public hadith statistics must exclude unpublished database rows",
);
assert.match(
  hadithService,
  /published=eq\.true/,
  "the public hadith catalogue must remain scoped to published rows",
);
assert.match(
  stats,
  /if \(table === "kids_content"\)/,
  "Kids statistics must use a dedicated public-visibility filter",
);
assert.match(
  stats,
  /\.eq\("is_active", true\)/,
  "inactive published Kids rows must not inflate public statistics",
);
assert.match(
  stats,
  /\.or\("type\.neq\.story,metadata->>age_appropriate\.eq\.true"\)/,
  "unreviewed or rejected Kids stories must not inflate public statistics",
);

console.log("Public content statistics visibility contracts passed.");
