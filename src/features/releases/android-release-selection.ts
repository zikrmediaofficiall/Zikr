export type AndroidReleaseSelectionCandidate = {
  tag_name?: string;
};

/**
 * An explicitly validated admin pin is authoritative even when it is older
 * than the newest stable release. This is the documented rollback/hold control.
 * Callers resolve the tag through getStableReleaseByTag before passing it here.
 */
export function selectAndroidRelease<T extends AndroidReleaseSelectionCandidate>(
  latestStable: T | null,
  pinned: T | null,
): T | null {
  return pinned ?? latestStable;
}
