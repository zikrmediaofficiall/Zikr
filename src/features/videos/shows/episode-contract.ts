import { evaluateArabicNarrationText } from "../services/narration-quality";
import { countEgyptianMarkers, hasFormalOnlyParticles } from "./egyptian-register";
import { HADY_SHOW, type HadySegmentId } from "./hady-show";

export type EpisodeSourceRef = {
  kind: "quran" | "hadith" | "seerah";
  reference: string;
  /** Set by a human reviewer after comparing the text with the platform database. */
  verified: boolean;
};

/**
 * Verbatim religious text is never typed into a script. A segment points at it with a placeholder
 * such as {{quote:0}} and lists the source; the renderer inserts the verified text and reads it in
 * the formal voice.
 */
export type EpisodeQuote = { kind: "quran" | "hadith"; reference: string };

export type EpisodeSegment = {
  id: HadySegmentId;
  text: string;
  quotes?: readonly EpisodeQuote[];
  sourceRefs?: readonly EpisodeSourceRef[];
};

export type HadyEpisode = {
  week: number;
  titleAr: string;
  theme: string;
  background: string;
  segments: readonly EpisodeSegment[];
  review: { status: "draft" | "approved"; reviewer?: string; reviewedAt?: string };
};

export type EpisodeValidation = { ok: boolean; errors: string[]; warnings: string[]; estimatedSeconds: number; wordCount: number };

// Attribution phrases must come from a quote card, not from free text the host improvises.
const FREE_TEXT_ATTRIBUTION = /(?<![\p{L}\p{M}])(?:قال الله|قال تعالى|قال رسول الله|قال النبي|عن النبي|حديث قدسي|حديث نبوي|في الحديث)(?![\p{L}\p{M}])/u;
// The host gives encouragement, not rulings.
const RULING_TERMS = /(?<![\p{L}\p{M}])(?:حرام|حلال|فتوى|كافر|بدعة|مبتدع|يجوز|لا يجوز|واجب|فرض)(?![\p{L}\p{M}])/u;
const HONORIFICS = /(?:رضي الله عنه|رضي الله عنها|عليه السلام|صلى الله عليه وسلم|ﷺ)/u;
const QUOTE_PLACEHOLDER = /\{\{quote:(\d+)\}\}/gu;

const stripDiacritics = (value: string) => value.normalize("NFKC").replace(/[\u0640\u064B-\u065F\u0670]/gu, "").replace(/\s+/gu, " ").trim();

function hostWords(segment: EpisodeSegment): number {
  const spoken = stripDiacritics(segment.text.replace(QUOTE_PLACEHOLDER, " "));
  return spoken ? spoken.split(" ").filter(Boolean).length : 0;
}

export function estimateEpisodeSeconds(episode: Pick<HadyEpisode, "segments">): number {
  const { wordsPerSecond, pauseSecondsPerSegment, secondsPerQuote } = HADY_SHOW.episode;
  const words = episode.segments.reduce((sum, segment) => sum + hostWords(segment), 0);
  const quotes = episode.segments.reduce((sum, segment) => sum + (segment.quotes?.length ?? 0), 0);
  return Math.round((words / wordsPerSecond + episode.segments.length * pauseSecondsPerSegment + quotes * secondsPerQuote) * 10) / 10;
}

export function validateHadyEpisode(episode: HadyEpisode, knownBackgrounds: ReadonlySet<string>): EpisodeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const spec = HADY_SHOW.segments;

  if (episode.segments.length !== spec.length || episode.segments.some((segment, index) => segment.id !== spec[index].id)) {
    errors.push("Episode must contain exactly hook, advice, story, reflection and closing in that order.");
  }
  if (!knownBackgrounds.has(episode.background)) errors.push(`Unknown background: ${episode.background}.`);
  if (!episode.titleAr.trim()) errors.push("Episode needs an Arabic title.");

  let wordCount = 0;
  for (const segment of episode.segments) {
    const rule = spec.find((item) => item.id === segment.id);
    const words = hostWords(segment);
    wordCount += words;
    if (rule && (words < rule.minWords || words > rule.maxWords)) {
      errors.push(`${segment.id}: ${words} words, expected ${rule.minWords}-${rule.maxWords}.`);
    }

    const normalized = stripDiacritics(segment.text);
    const quality = evaluateArabicNarrationText(segment.text.replace(QUOTE_PLACEHOLDER, " "), "other");
    for (const message of quality.errors) errors.push(`${segment.id}: ${message}`);
    if (hasFormalOnlyParticles(normalized)) errors.push(`${segment.id}: contains formal-only wording; the host must speak Egyptian colloquial Arabic.`);
    if (countEgyptianMarkers(normalized) < 2 && words >= 20) errors.push(`${segment.id}: does not read as Egyptian colloquial Arabic.`);
    if (FREE_TEXT_ATTRIBUTION.test(normalized)) errors.push(`${segment.id}: religious attribution must come from a quote card with a source, not free text.`);
    if (RULING_TERMS.test(normalized)) errors.push(`${segment.id}: the host gives encouragement, not religious rulings.`);
    if (HONORIFICS.test(segment.text) && !(segment.sourceRefs ?? []).some((ref) => ref.verified)) {
      errors.push(`${segment.id}: honorifics appear without a verified source reference.`);
    }

    const placeholders = [...segment.text.matchAll(QUOTE_PLACEHOLDER)].map((match) => Number(match[1]));
    const quoteCount = segment.quotes?.length ?? 0;
    if (placeholders.some((index) => index >= quoteCount)) errors.push(`${segment.id}: quote placeholder has no matching quote.`);
    if (quoteCount > 0 && new Set(placeholders).size !== quoteCount) errors.push(`${segment.id}: every quote must be referenced once by a placeholder.`);
  }

  const first = episode.segments[0];
  const last = episode.segments[episode.segments.length - 1];
  if (first && !stripDiacritics(first.text).startsWith(stripDiacritics(HADY_SHOW.signature.openingAr))) {
    errors.push("The episode must open with the host's signature greeting.");
  }
  if (last && !stripDiacritics(last.text).endsWith(stripDiacritics(HADY_SHOW.signature.closingAr))) {
    errors.push("The episode must end with the host's signature farewell.");
  }

  const story = episode.segments.find((segment) => segment.id === "story");
  if (!story || !(story.sourceRefs ?? []).some((ref) => ref.verified)) {
    errors.push("The story needs at least one source reference confirmed by a reviewer.");
  }
  if (episode.review.status === "approved" && !episode.review.reviewer?.trim()) {
    errors.push("An approved episode must name its reviewer.");
  }

  const estimatedSeconds = estimateEpisodeSeconds(episode);
  if (estimatedSeconds < HADY_SHOW.episode.minSeconds || estimatedSeconds > HADY_SHOW.episode.maxSeconds) {
    errors.push(`Estimated duration ${estimatedSeconds}s is outside ${HADY_SHOW.episode.minSeconds}-${HADY_SHOW.episode.maxSeconds}s.`);
  }
  if (episode.segments.every((segment) => !(segment.quotes?.length))) {
    warnings.push("The episode has no Quran or Hadith quote card.");
  }

  return { ok: errors.length === 0, errors, warnings, estimatedSeconds, wordCount };
}

/** Structural QA is automatic, but a religious episode is not production-ready without a recorded human source review. */
export function validateHadyEpisodeForProduction(
  episode: HadyEpisode,
  knownBackgrounds: ReadonlySet<string>,
): EpisodeValidation {
  const result = validateHadyEpisode(episode, knownBackgrounds);
  const errors = [...result.errors];
  if (episode.review.status !== "approved") errors.push("A human reviewer must approve the episode before rendering.");
  if (!episode.review.reviewer?.trim() || episode.review.reviewer.trim().startsWith("system:")) {
    errors.push("Production approval must name a human reviewer; automated QA cannot approve the religious script.");
  }
  if (!episode.review.reviewedAt || !Number.isFinite(Date.parse(episode.review.reviewedAt))) {
    errors.push("A valid human review timestamp is required before rendering.");
  }
  for (const segment of episode.segments) {
    for (const quote of segment.quotes ?? []) {
      const verified = (segment.sourceRefs ?? []).some((source) =>
        source.verified && source.kind === quote.kind && source.reference === quote.reference,
      );
      if (!verified) errors.push(`${segment.id}: quote ${quote.reference} must match an individually verified source reference.`);
    }
  }
  return { ...result, ok: errors.length === 0, errors };
}
