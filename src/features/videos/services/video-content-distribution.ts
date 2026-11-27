/**
 * Stable 14-video editorial mix. Mode IDs align with template-video-automation:
 * 0 Quran, 1 Hadith, 2 Dua, 3 Adhkar, 4 verified story, 5 Kids, 6 general.
 */
export const AUTOMATED_VIDEO_MODE_SEQUENCE = [
  0, 2, 0, 1, 2, 5, 3, 0, 2, 1, 2, 0, 5, 4,
] as const;
export type AutomatedVideoMode = (typeof AUTOMATED_VIDEO_MODE_SEQUENCE)[number];

export function resolveAutomatedVideoMode(globalSlot: number): AutomatedVideoMode {
  if (!Number.isSafeInteger(globalSlot) || globalSlot < 0) {
    throw new RangeError("Video distribution slot must be a non-negative safe integer.");
  }
  return AUTOMATED_VIDEO_MODE_SEQUENCE[globalSlot % AUTOMATED_VIDEO_MODE_SEQUENCE.length];
}
