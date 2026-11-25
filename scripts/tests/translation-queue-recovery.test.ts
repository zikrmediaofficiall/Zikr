import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveStaleTranslationQueueRecovery } from "../../src/features/articles/services/translation-queue-recovery";

const completedArticle = {
  published: true,
  title_en: "A verified English title",
  summary_en: "A concise English summary",
  content_en: "A complete English article body.",
};

const recovered = resolveStaleTranslationQueueRecovery({
  article: completedArticle,
  sourceHashMatches: true,
});
assert.deepEqual(recovered, {
  status: "generated",
  draftPayload: {
    title_en: "A verified English title",
    summary_en: "A concise English summary",
    content_en: "A complete English article body.",
  },
});

assert.equal(
  resolveStaleTranslationQueueRecovery({
    article: completedArticle,
    sourceHashMatches: false,
  }).status,
  "failed",
  "a stale worker must not finalize a translation for a changed Arabic source",
);
assert.equal(
  resolveStaleTranslationQueueRecovery({
    article: { ...completedArticle, published: false },
    sourceHashMatches: true,
  }).status,
  "failed",
  "a translation for an unpublished article must not be reconciled as generated",
);
assert.equal(
  resolveStaleTranslationQueueRecovery({
    article: { ...completedArticle, content_en: null },
    sourceHashMatches: true,
  }).status,
  "failed",
  "partial English fields must remain retryable rather than being marked generated",
);
assert.equal(
  resolveStaleTranslationQueueRecovery({
    article: null,
    sourceHashMatches: false,
  }).status,
  "failed",
  "a deleted source article must not leave a permanently processing queue row",
);

const translationWorker = readFileSync("scripts/translate-published-articles-en.ts", "utf8");
assert.ok(translationWorker.includes("systemInstruction: ARTICLE_TRANSLATION_SYSTEM_INSTRUCTION"),
  "translation rules must use Gemini's system-instruction channel");
assert.ok(translationWorker.includes("return JSON.stringify({"),
  "Arabic article fields must be serialized as source data");
assert.ok(translationWorker.includes("contentAr: article.content_ar"),
  "the complete Arabic source must remain available as data for faithful translation");
assert.ok(!translationWorker.includes("CONTENT_AR:"),
  "article text must not be concatenated into the instruction prompt");

console.log("Stale translation queue recovery contracts passed.");
