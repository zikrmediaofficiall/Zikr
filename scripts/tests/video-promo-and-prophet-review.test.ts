import assert from "node:assert/strict";
import {
  DEFAULT_PROMO_VIDEO_TIME_ZONE,
  DEFAULT_WEEKLY_PROMO_VIDEO_TARGET,
  MAX_WEEKLY_PROMO_VIDEO_TARGET,
  ZIKR_PROMOTIONAL_VIDEO_CONCEPTS,
  resolvePromotionalVideoConcept,
  resolvePromotionalVideoScheduledAt,
  resolveWeeklyPromoVideoTarget,
  selectPromotionalVideoConcept,
  selectUpcomingWeeklyPromoSlots,
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

assert.equal(DEFAULT_WEEKLY_PROMO_VIDEO_TARGET, 2);
assert.equal(DEFAULT_PROMO_VIDEO_TIME_ZONE, "Africa/Cairo");
assert.equal(resolveWeeklyPromoVideoTarget(undefined), 2);
assert.equal(resolveWeeklyPromoVideoTarget("99"), MAX_WEEKLY_PROMO_VIDEO_TARGET, "operator configuration must respect the campaign safety cap");
assert.equal(resolveWeeklyPromoVideoTarget("-2"), 0);
assert.equal(resolveWeeklyPromoVideoTarget("garbage"), 2, "invalid optional configuration falls back to the safe default");
assert.equal(ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.length, 8);
assert.equal(new Set(ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.map((concept) => concept.key)).size, 8);
const twoWeeklyPromoPosts = Array.from({ length: 32 }, (_, week) => [0, 1].map((slot) => selectPromotionalVideoConcept(week, slot))).flat();
assert.equal(new Set(twoWeeklyPromoPosts.map((concept) => concept.narration)).size, 64, "weekly copy should vary deterministically across 32 weeks");
for (const concept of twoWeeklyPromoPosts) {
  assert.equal(evaluateArabicNarrationText(concept.narration, "other").ok, true, "promotional narration must pass production Arabic QA");
}
assert.equal(resolvePromotionalVideoConcept("one-quiet-minute")?.featureKey, "quran");
assert.equal(resolvePromotionalVideoConcept("not-curated"), null);
assert.equal(resolveVideoSourceDisclosureLine({
  sourceType: "marketing",
  sourceLabel: "محتوى ترويجي أصلي من منصة ذِكر — عرض لمزايا الموقع والتطبيق",
}, "https://zikr.example.test/quran"), "محتوى ترويجي أصلي من منصة ذِكر — عرض لمزايا الموقع والتطبيق",
"promotional copy must be disclosed as original product content, not an external religious source");
assert.deepEqual(selectPromotionalVideoConcept(500, 1), selectPromotionalVideoConcept(500, 1), "weekly selection must be deterministic for the same local date and slot");

// Cairo uses UTC+3 in July (DST) and UTC+2 in December (standard time).
assert.equal(resolvePromotionalVideoScheduledAt("2026-07-08", 0)?.toISOString(), "2026-07-08T15:00:00.000Z", "Wednesday 18:00 Cairo must convert through summer time");
assert.equal(resolvePromotionalVideoScheduledAt("2026-07-10", 1)?.toISOString(), "2026-07-10T13:00:00.000Z", "Friday 16:00 Cairo must convert through summer time");
assert.equal(resolvePromotionalVideoScheduledAt("2026-12-02", 0)?.toISOString(), "2026-12-02T16:00:00.000Z", "Wednesday 18:00 Cairo must convert through standard time");
assert.equal(resolvePromotionalVideoScheduledAt("2026-12-04", 1)?.toISOString(), "2026-12-04T14:00:00.000Z", "Friday 16:00 Cairo must convert through standard time");
assert.equal(resolvePromotionalVideoScheduledAt("2026-12-03", 0), null, "a slot cannot be assigned to the wrong weekday");
assert.equal(resolvePromotionalVideoScheduledAt("2026-12-02", 0, "Not/A_Zone"), null, "invalid IANA zones must fail closed");
const upcoming = selectUpcomingWeeklyPromoSlots(new Date("2026-07-08T12:00:00.000Z"), DEFAULT_PROMO_VIDEO_TIME_ZONE, 2, 0);
assert.deepEqual(upcoming.map(({ localDate, slot, scheduledAt }) => ({ localDate, slot, scheduledAt })), [
  { localDate: "2026-07-08", slot: 0, scheduledAt: "2026-07-08T15:00:00.000Z" },
  { localDate: "2026-07-10", slot: 1, scheduledAt: "2026-07-10T13:00:00.000Z" },
], "the approved schedule must select Wednesday 18:00 and Friday 16:00 Cairo");
assert.equal(selectUpcomingWeeklyPromoSlots(new Date("2026-07-08T12:00:00.000Z"), DEFAULT_PROMO_VIDEO_TIME_ZONE, 1, 0).length, 1);
assert.equal(selectUpcomingWeeklyPromoSlots(new Date("2026-07-08T12:00:00.000Z"), DEFAULT_PROMO_VIDEO_TIME_ZONE, 0, 0).length, 0);
assert.throws(() => selectUpcomingWeeklyPromoSlots(new Date(), "Not/A_Zone"), /time zone/i);

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
assert.match(schedulerSource, /selectUpcomingWeeklyPromoSlots\(now, timeZone, target, 0\)/);
assert.match(schedulerSource, /promo-weekly:\$\{publishSlot\.localDate\}:\$\{publishSlot\.slot\}:\$\{concept\.key\}/);
assert.match(schedulerSource, /promoScheduledAt: publishSlot\.scheduledAt/);
assert.match(schedulerSource, /scheduled_at: promoScheduledAt\?\.toISOString\(\) \?\? null/);
assert.match(schedulerSource, /contentText\(request\) === promoConcept\?\.narration/);
assert.match(schedulerSource, /content\.ctaUrl === `\$\{siteUrl\(\)\}\$\{promoConcept\?\.ctaPath\}`/);
assert.doesNotMatch(schedulerSource, /selectDailyPromotionalVideoSlots|PROMO_VIDEO_DAILY_TARGET/);

console.log("Weekly Cairo promo scheduling, UTC queue propagation, and source-locked Prophet-story review gates passed.");
