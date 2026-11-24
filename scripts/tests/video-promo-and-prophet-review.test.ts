import assert from "node:assert/strict";
import {
  DEFAULT_DAILY_PROMO_VIDEO_TARGET,
  MAX_DAILY_PROMO_VIDEO_TARGET,
  ZIKR_PROMOTIONAL_VIDEO_CONCEPTS,
  resolveDailyPromoVideoTarget,
  resolvePromotionalVideoConcept,
  selectDailyPromotionalVideoConcept,
  selectDailyPromotionalVideoSlots,
} from "../../src/features/videos/data/promotional-video-campaign";
import {
  buildProphetEpisodeCandidate,
  PROPHET_STORY_RESEARCH_CANDIDATES,
  PROPHET_STORY_SERIES,
  validateProphetEpisodeForQueue,
  type ProphetEpisodeHumanReview,
} from "../../src/features/videos/data/prophet-story-series";
import { evaluateArabicNarrationText } from "../../src/features/videos/services/narration-quality";
import { resolveVideoSourceDisclosureLine } from "../../src/features/videos/services/video-source-contract";
import { readFileSync } from "node:fs";

assert.equal(DEFAULT_DAILY_PROMO_VIDEO_TARGET, 2);
assert.equal(resolveDailyPromoVideoTarget(undefined, 12), 2);
assert.equal(resolveDailyPromoVideoTarget("99", 12), 8, "operator configuration must respect the campaign safety cap");
assert.equal(resolveDailyPromoVideoTarget("-2", 12), 0);
assert.equal(resolveDailyPromoVideoTarget("garbage", 12), 2, "invalid optional configuration falls back to the safe default");
assert.equal(ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.length, 8);
assert.equal(new Set(ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.map((concept) => concept.key)).size, 8);
const twoDailyPromoPosts = Array.from({ length: 32 }, (_, day) => [0, 1].map((slot) => selectDailyPromotionalVideoConcept(day, slot))).flat();
assert.equal(new Set(twoDailyPromoPosts.map((concept) => concept.narration)).size, 64, "the campaign must provide two non-repeating narrations daily for at least 32 days");
for (const concept of twoDailyPromoPosts) {
  assert.equal(evaluateArabicNarrationText(concept.narration, "other").ok, true, "promotional narration must pass production Arabic QA");
}
assert.equal(resolvePromotionalVideoConcept("one-quiet-minute")?.featureKey, "quran");
assert.equal(resolvePromotionalVideoConcept("not-curated"), null);
assert.equal(resolveVideoSourceDisclosureLine({
  sourceType: "marketing",
  sourceLabel: "محتوى ترويجي أصلي من منصة ذِكر — عرض لمزايا الموقع والتطبيق",
}, "https://zikr.example.test/quran"), "محتوى ترويجي أصلي من منصة ذِكر — عرض لمزايا الموقع والتطبيق",
"promotional copy must be disclosed as original product content, not an external religious source");
assert.deepEqual(selectDailyPromotionalVideoConcept(500, 1), selectDailyPromotionalVideoConcept(500, 1), "daily selection must be deterministic");
for (const target of [1, 2, 6, 7, 8, 12, 24]) {
  const slots = selectDailyPromotionalVideoSlots(target);
  assert.equal(slots.length, Math.min(2, target - Math.floor(target / 7)), "promo slots must not displace reserved Kids-series slots");
  assert.equal(new Set(slots).size, slots.length, "promo slot assignments must be unique");
  assert.ok(slots.every((slot) => slot >= 0 && slot < target && slot % 7 !== 5), "promo slots must stay inside the daily quota and outside Kids slots");
}
assert.equal(selectDailyPromotionalVideoSlots(12).length, 2, "the default 12-video daily quota must release two promos per day");
assert.equal(selectDailyPromotionalVideoSlots(12, "0").length, 0, "an explicit zero disables only the campaign reservations");
assert.ok(MAX_DAILY_PROMO_VIDEO_TARGET <= 8);

assert.equal(PROPHET_STORY_RESEARCH_CANDIDATES.length, 25, "candidate research must include the traditional 25-prophet list");
assert.equal(PROPHET_STORY_SERIES.visualStyle, "symbolic-claymation");
assert.match(PROPHET_STORY_SERIES.visualRules.join(" "), /Never depict a prophet or companion/);
assert.ok(PROPHET_STORY_RESEARCH_CANDIDATES.every((story) =>
  story.editorialStatus === "research_candidate_not_approved" && story.humanReviewRequired && story.autoPublishEligible === false,
), "no automated researcher output may be promoted to approved or publishable content");

const firstStory = PROPHET_STORY_RESEARCH_CANDIDATES.find((story) => story.storyBeats.length > 0);
assert.ok(firstStory, "research must include at least one story beat");
const candidate = buildProphetEpisodeCandidate(firstStory.id, firstStory.storyBeats[0]!.sequence);
assert.ok(candidate, "a source-backed beat with Quran references should produce a draft candidate");
assert.equal(candidate?.autoPublishEligible, false);
assert.equal(candidate?.editorialStatus, "research_candidate_not_approved");
assert.equal(validateProphetEpisodeForQueue(candidate!).ok, false, "AI or research output alone must not pass editorial approval");
assert.ok(validateProphetEpisodeForQueue(candidate!).errors.some((error) => error.includes("human editorial approval")));

const completeReview: ProphetEpisodeHumanReview = {
  status: "approved",
  reviewerId: "editor-1",
  reviewedAt: "2026-11-24T12:00:00.000Z",
  sourceReferencesVerified: candidate!.sourceReferences,
  unsupportedDetailsRemoved: true,
  scriptReviewed: true,
  childSafetyReviewed: true,
  symbolicClayVisualsReviewed: true,
};
assert.equal(validateProphetEpisodeForQueue(candidate!, completeReview).ok, true, "all review gates must be completed by a named human");
assert.equal(validateProphetEpisodeForQueue(candidate!, { ...completeReview, reviewerId: "system:ai" }).ok, false);
assert.equal(validateProphetEpisodeForQueue(candidate!, { ...completeReview, sourceReferencesVerified: [] }).ok, false);
assert.equal(validateProphetEpisodeForQueue(candidate!, { ...completeReview, symbolicClayVisualsReviewed: false }).ok, false);
assert.equal(validateProphetEpisodeForQueue({ ...candidate!, researchSummaryAr: "نص محرّف" }, completeReview).ok, false,
  "edited research summaries must not pass the source-locked candidate validator");

const sourceFile = readFileSync("src/features/videos/data/prophet-story-research-candidates.json", "utf8");
assert.match(sourceFile, /sourceUrls/);
assert.match(sourceFile, /research_candidate_not_approved/);
const schedulerSource = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.match(schedulerSource, /selectDailyPromotionalVideoSlots/);
assert.match(schedulerSource, /promo:\$\{day\}:\$\{promoSlot\}:\$\{concept\.key\}/);
assert.match(schedulerSource, /contentText\(request\) === promoConcept\?\.narration/);
assert.match(schedulerSource, /content\.ctaUrl === `\$\{siteUrl\(\)\}\$\{promoConcept\?\.ctaPath\}`/);

console.log("Video promo scheduling and source-locked Prophet-story review gates passed.");
