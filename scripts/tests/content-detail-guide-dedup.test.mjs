import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editorial = readFileSync("src/components/content/editorial-depth.tsx", "utf8");
const expansion = readFileSync("src/components/content/content-expansion.tsx", "utf8");
const utility = readFileSync("src/components/content/editorial-utility-depth.tsx", "utf8");

assert.match(editorial, /normalized === '\/about' \|\| normalized === '\/contact'/);
assert.ok(editorial.includes("if (normalized === '/' || normalized === '/about' || normalized === '/contact') return null;"), "the homepage must not render duplicate editorial guide blocks");
assert.ok(expansion.includes("  '/': page("), "the homepage retains its focused ContentExpansion guide");
assert.ok(editorial.includes("const dedicatedUtilityGuideRoutes = new Set(["));
assert.ok(editorial.includes("if (dedicatedUtilityGuideRoutes.has(normalized)) return null;"));
for (const route of ["/prayer-times", "/qibla", "/tasbeeh", "/memorization", "/wird"]) {
  assert.ok(utility.includes("'" + route + "':"), "the route must keep its specialized utility guide: " + route);
}

assert.match(expansion, /'\/about'.*'\/privacy'.*'\/terms'/);
assert.match(editorial, /const specializedDetailPrefixes = \[/);
assert.match(editorial, /if \(hasSpecializedDetailGuide && !staticKidsRoutes\.has\(normalized\)\) return null/);
assert.match(editorial, /'\/kids\/games'/, "static Kids landing pages retain the generic Kids guide");
assert.match(editorial, /'\/kids\/parent-dashboard'/, "the parent dashboard retains its existing guide");

for (const prefix of ["/quran", "/hadith", "/dua", "/prophets", "/companions", "/scholars", "/articles", "/stories", "/videos", "/kids/videos", "/content"]) {
  const expected = "'" + prefix + "': page(";
  assert.ok(
    expansion.includes(expected),
    "the expanded content layer must provide a focused guide for " + prefix,
  );
}

assert.match(expansion, /EXISTING_DEDICATED_GUIDE_ROUTES/);
assert.match(expansion, /const STATIC_KIDS_GUIDE_ROUTES = new Set\(/);
assert.match(expansion, /if \(STATIC_KIDS_GUIDE_ROUTES\.has\(path\)\) return null/);
assert.match(expansion, /'\/kids\/videos': page\(/);
assert.match(expansion, /'تفاصيل فيديو الأطفال'/);

console.log("Detail-guide deduplication contract passed.");
