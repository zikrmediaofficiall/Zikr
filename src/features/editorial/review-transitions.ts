/**
 * Editorial review state machine for content_library.review_status.
 *
 * Content must pass editorial and scholarly review before approval. Any state
 * can go back to draft (rework) and a rejected item can only restart as draft.
 * Same-state requests are not transitions.
 */
export const REVIEW_STATES = [
  "draft",
  "editorial_review",
  "scholarly_review",
  "approved",
  "rejected",
] as const;

export type ReviewState = (typeof REVIEW_STATES)[number];

const ALLOWED: Record<ReviewState, readonly ReviewState[]> = {
  draft: ["editorial_review"],
  editorial_review: ["scholarly_review", "rejected", "draft"],
  scholarly_review: ["approved", "rejected", "editorial_review", "draft"],
  approved: ["draft", "scholarly_review"],
  rejected: ["draft"],
};

export function isReviewState(value: unknown): value is ReviewState {
  return typeof value === "string" && (REVIEW_STATES as readonly string[]).includes(value);
}

export function allowedReviewTransitions(from: string): readonly ReviewState[] {
  return isReviewState(from) ? ALLOWED[from] : [];
}

export function canTransitionReview(from: string, to: string): boolean {
  return isReviewState(to) && allowedReviewTransitions(from).includes(to);
}
