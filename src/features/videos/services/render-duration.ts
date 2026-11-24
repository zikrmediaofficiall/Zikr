/**
 * Resolve the render duration without truncating the audio track.
 *
 * Standard automated vertical videos remain limited to 60 seconds. A bounded
 * 120-second ceiling is available only to the server-authorized Layl program.
 * The 0.8s tail preserves the end of speech and the audio fade.
 */
export const MAX_AUTO_VIDEO_SECONDS = 60;

export function resolveRenderDuration(
  audioDuration: number,
  targetVideoSeconds: number = 18,
  maxDurationSeconds: number = MAX_AUTO_VIDEO_SECONDS,
): number {
  // Only the dedicated, server-authorized Layl series may opt into 120 seconds.
  const maxAllowed = maxDurationSeconds === 120 ? 120 : MAX_AUTO_VIDEO_SECONDS;
  const target = Number.isFinite(targetVideoSeconds)
    ? Math.min(45, Math.max(10, targetVideoSeconds))
    : 18;

  if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
    return target;
  }

  const desired = Math.max(Math.min(target, 10), audioDuration + 0.8);
  if (desired > maxAllowed) {
    throw new Error(
      "Narration is too long for an automated short: " +
        audioDuration.toFixed(1) +
        "s > " +
        maxAllowed.toFixed(1) +
        "s max.",
    );
  }

  return Math.min(maxAllowed, desired);
}
