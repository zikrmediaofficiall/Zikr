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
