/**
 * Determines whether the only remaining media pointers in a terminal request
 * are aliases of its own verified generated MP4. Those aliases can be cleared
 * with the request's root video_url; unrelated media is never discarded.
 */
export type GeneratedVideoContentPreparation =
  | { ok: true; content: Record<string, unknown>; changed: boolean }
  | { ok: false; reason: "retained-media-reference" };

export function prepareGeneratedVideoContentForDeletion(
  value: unknown,
  verifiedVideoUrl: string,
): GeneratedVideoContentPreparation {
  const content: Record<string, unknown> =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};

  const protectedKeys = [
    "audioUrl",
    "humanAudioUrl",
    "audioMediaAssetId",
    "audioMediaAssetOwnerId",
    "thumbnailUrl",
  ];
  if (
    protectedKeys.some(
      (key) => typeof content[key] === "string" && String(content[key]).trim().length > 0,
    ) ||
    content.audioSource === "human_recording"
  ) {
    return { ok: false, reason: "retained-media-reference" };
  }

  let changed = false;
  for (const key of ["videoUrl", "generatedVideoUrl"]) {
    const pointer = content[key];
    if (typeof pointer !== "string" || !pointer.trim()) continue;
    if (!verifiedVideoUrl || pointer.trim() !== verifiedVideoUrl) {
      return { ok: false, reason: "retained-media-reference" };
    }
    delete content[key];
    changed = true;
  }

  return { ok: true, content, changed };
}
