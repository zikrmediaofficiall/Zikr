/**
 * Lightweight checks that a script reads as Egyptian colloquial Arabic rather than formal Arabic.
 * They are deliberately conservative: they catch obvious regressions, not every dialect nuance.
 */
const FORMAL_ONLY = /(?:^|\s)(?:الذي|التي|الذين|سوف|لكنه|لكنها|لقد|حيث إن|بيد أن)(?:\s|$)/u;
const EGYPTIAN_MARKERS = /(?:إيه|إزاي|ليه|عشان|مش\s|ده\s|دي\s|دول\s|بقى|لسه|كده|اللي|لمّا|هيحصل|بيحصل|بتحس|هتلاقي|خلّي|يا حبايب|يعني|برضه|أوي|قوي|حاجة)/gu;

export function hasFormalOnlyParticles(text: string): boolean {
  return FORMAL_ONLY.test(text);
}

export function countEgyptianMarkers(text: string): number {
  return (text.match(EGYPTIAN_MARKERS) ?? []).length;
}
