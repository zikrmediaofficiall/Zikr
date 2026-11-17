export type PublicStoryVisibilityRecord = {
  published?: unknown;
  is_approved?: unknown;
  user_id?: unknown;
};

/**
 * A story is public only when it is explicitly published, approved, and global.
 * User-owned rows are deliberately excluded from public routes and automation.
 */
export function isPublicStoryRecord(value: unknown): value is PublicStoryVisibilityRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as PublicStoryVisibilityRecord;
  return row.published === true && row.is_approved === true && row.user_id === null;
}

/**
 * Keep a successful empty query empty, and filter any non-public records rather
 * than treating them as a reason to serve a stale static copy. A non-array
 * response is distinct from an empty result and may use the caller's outage
 * fallback.
 */
export function filterPublicStoryRecords<T extends PublicStoryVisibilityRecord>(
  value: unknown,
): T[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(isPublicStoryRecord) as T[];
}
