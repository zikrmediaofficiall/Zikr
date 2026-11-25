import assert from "node:assert/strict";
import {
  checkKeywordDensity,
  generateSlug,
  generateStructuredData,
  optimizeTextForSEO,
} from "../../src/lib/seo";

assert.equal(generateSlug("قِصَّةُ الأنبياء"), "قصة-الانبياء");
assert.equal(generateSlug("  ZIKR — ذِكرٌ  "), "zikr-ذكر");
assert.equal(generateSlug("Hello, World!"), "hello-world");
assert.equal(generateSlug("مرحبا  بالعالم"), "مرحبا-بالعالم");
assert.equal(generateSlug(""), "");

assert.deepEqual(
  generateStructuredData("Article", {
    "@context": "https://attacker.invalid",
    "@type": "FakeType",
    headline: "ZIKR",
  }),
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ZIKR",
  },
);

assert.equal(checkKeywordDensity("", "Allah"), 0);
assert.equal(checkKeywordDensity("   ", "Allah"), 0);
assert.equal(checkKeywordDensity("Allah Allah", "Allah"), 100);
assert.equal(checkKeywordDensity("Allah and Allah", "Allah"), (2 / 3) * 100);
assert.equal(checkKeywordDensity("Allah", "   "), 0);

assert.equal(optimizeTextForSEO("  Hello   world\nfrom ZIKR  "), "Hello world from ZIKR");
const truncatedEmoji = optimizeTextForSEO("😀".repeat(161), 160);
assert.equal(Array.from(truncatedEmoji).length, 160);
assert.equal(truncatedEmoji.endsWith("..."), true);
assert.equal(truncatedEmoji.slice(0, -3), "😀".repeat(157));
assert.equal(optimizeTextForSEO("abcdef", 2), "ab");
assert.equal(optimizeTextForSEO("abcdef", 0), "");

console.log("SEO utility regression tests passed");
