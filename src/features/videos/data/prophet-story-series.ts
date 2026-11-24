import research from "./prophet-story-research-candidates.json";

export type ProphetStoryResearchCandidate = {
  id: string;
  prophetAr: string;
  quranReferences: Array<{ reference: string; url: string; supportedFact: string }>;
  storyBeats: Array<{ sequence: number; summaryAr: string; references: string[] }>;
  unverifiedOrDisputed: string[];
  clayVisualGuidance: string;
  sourceUrls: string[];
  verifiedHadithSources: Array<{ collection: string; reference: string; grading: string; url: string }>;
  editorialStatus: "research_candidate_not_approved";
  humanReviewRequired: true;
  autoPublishEligible: false;
};

export type ProphetEpisodeCandidate = {
  seriesId: "prophets-clay";
  seriesTitleAr: "قصص الأنبياء بالصلصال";
  id: string;
  prophetId: string;
  prophetAr: string;
  episodeNumber: number;
  episodeTitleAr: string;
  researchSummaryAr: string;
  sourceReferences: string[];
  sourceUrls: string[];
  excludedDetails: string[];
  visualRules: readonly string[];
  editorialStatus: "research_candidate_not_approved";
  autoPublishEligible: false;
};

export type ProphetEpisodeHumanReview = {
  status: "approved";
  reviewerId: string;
  reviewedAt: string;
  sourceReferencesVerified: readonly string[];
  unsupportedDetailsRemoved: boolean;
  scriptReviewed: boolean;
  childSafetyReviewed: boolean;
  symbolicClayVisualsReviewed: boolean;
};

export const PROPHET_STORY_SERIES = {
  id: "prophets-clay" as const,
  titleAr: "قصص الأنبياء بالصلصال" as const,
  audience: "kids" as const,
  visualStyle: "symbolic-claymation" as const,
  episodeUnit: "one research beat per candidate episode" as const,
  publicationRule: "automated quality checks are not religious approval; human source review is required before rendering or external publication" as const,
  visualRules: [
    "Never depict a prophet or companion, including a face, body, shadow, silhouette, avatar, or first-person stand-in.",
    "Use only symbolic clay environments, landscapes, objects, weather, architecture, and non-human animals where the source supports them.",
    "Do not invent dialogue, chronology, motives, miracles, or visual details beyond the cited source material.",
  ] as const,
};

const candidateData = research as unknown as { stories: ProphetStoryResearchCandidate[] };
export const PROPHET_STORY_RESEARCH_CANDIDATES: readonly ProphetStoryResearchCandidate[] = candidateData.stories;

export function buildProphetEpisodeCandidate(
  prophetId: string,
  beatSequence: number,
): ProphetEpisodeCandidate | null {
  const story = PROPHET_STORY_RESEARCH_CANDIDATES.find((item) => item.id === prophetId);
  if (!story || !Number.isSafeInteger(beatSequence)) return null;
  const beat = story.storyBeats.find((item) => item.sequence === beatSequence);
  if (!beat || !beat.summaryAr.trim() || beat.references.length === 0) return null;
  const allowedReferences = new Set(story.quranReferences.map((item) => item.reference));
  if (beat.references.some((reference) => !allowedReferences.has(reference))) return null;
  const sourceUrls = beat.references.flatMap((reference) => {
    const source = story.quranReferences.find((item) => item.reference === reference);
    return source ? [source.url] : [];
  });
  if (sourceUrls.length !== beat.references.length || sourceUrls.some((url) => !url.startsWith("https://"))) return null;

  return {
    seriesId: PROPHET_STORY_SERIES.id,
    seriesTitleAr: PROPHET_STORY_SERIES.titleAr,
    id: `${story.id}:beat-${beat.sequence}`,
    prophetId: story.id,
    prophetAr: story.prophetAr,
    episodeNumber: beat.sequence,
    episodeTitleAr: `${story.prophetAr} — مشهد ${beat.sequence}`,
    researchSummaryAr: beat.summaryAr,
    sourceReferences: [...beat.references],
    sourceUrls,
    excludedDetails: [...story.unverifiedOrDisputed],
    visualRules: PROPHET_STORY_SERIES.visualRules,
    editorialStatus: "research_candidate_not_approved",
    autoPublishEligible: false,
  };
}

export function validateProphetEpisodeForQueue(
  candidate: ProphetEpisodeCandidate,
  review?: ProphetEpisodeHumanReview | null,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const canonical = buildProphetEpisodeCandidate(candidate.prophetId, candidate.episodeNumber);
  if (!canonical || candidate.id !== canonical.id || candidate.researchSummaryAr !== canonical.researchSummaryAr) {
    errors.push("Candidate content does not match the source-locked research record.");
  }
  if (candidate.editorialStatus !== "research_candidate_not_approved" || candidate.autoPublishEligible !== false) {
    errors.push("Research candidates cannot be treated as approved or auto-publish eligible.");
  }
  if (!review || review.status !== "approved") {
    errors.push("A documented human editorial approval is required before production or publication.");
  } else {
    if (!review.reviewerId.trim() || review.reviewerId.startsWith("system:")) errors.push("A named human reviewer is required.");
    if (!Number.isFinite(Date.parse(review.reviewedAt))) errors.push("Human review timestamp is invalid.");
    if (!review.unsupportedDetailsRemoved || !review.scriptReviewed || !review.childSafetyReviewed || !review.symbolicClayVisualsReviewed) {
      errors.push("All religious-source, script, child-safety, and symbolic-visual review checks must be complete.");
    }
    const verified = new Set(review.sourceReferencesVerified);
    if (candidate.sourceReferences.some((reference) => !verified.has(reference))) {
      errors.push("Every cited Quran reference must be individually verified by the human reviewer.");
    }
  }
  return { ok: errors.length === 0, errors };
}
