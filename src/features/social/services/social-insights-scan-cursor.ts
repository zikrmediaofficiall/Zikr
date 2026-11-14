import { supabaseServerAdminRequest } from "@/lib/supabase/admin-rest";

export type SocialInsightsScanPlatform = "youtube" | "facebook_reels";
export type SocialInsightsScanCursor = {
  createdAt: string;
  id: string;
};
export type SocialInsightsScanRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<T>;

type AdminSettingRow = {
  key: string;
  value: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cursorKey(platform: SocialInsightsScanPlatform): string {
  return "social_insights_scan_cursor_" + platform;
}

function isValidCursor(value: unknown): value is SocialInsightsScanCursor {
  if (!isRecord(value)) return false;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt.trim() : "";
  const id = typeof value.id === "string" ? value.id.trim() : "";
  return Boolean(createdAt) && Number.isFinite(Date.parse(createdAt)) && UUID_PATTERN.test(id);
}

/** Build a stable PostgREST keyset predicate for the social queue's immutable order. */
export function buildSocialInsightsQueueCursorFilter(
  cursor: SocialInsightsScanCursor | null,
): string {
  if (!cursor) return "";
  return "&or=" + encodeURIComponent(
    "(created_at.gt." + cursor.createdAt +
    ",and(created_at.eq." + cursor.createdAt + ",id.gt." + cursor.id + "))",
  );
}

/**
 * Keep each analytics worker's scan position in the existing private admin_settings
 * table. The social insights workflow is serialized, so a single upsert is sufficient.
 */
export async function readSocialInsightsScanCursor(
  platform: SocialInsightsScanPlatform,
  request: SocialInsightsScanRequest = supabaseServerAdminRequest,
): Promise<SocialInsightsScanCursor | null> {
  const key = cursorKey(platform);
  const rows = await request<AdminSettingRow[]>(
    "/rest/v1/admin_settings?key=eq." + key + "&select=key,value&limit=1",
  );
  if (!Array.isArray(rows)) {
    throw new Error("Social insights cursor query returned an invalid row set.");
  }
  const row = rows[0];
  if (!row) return null;
  if (row.key !== key) {
    throw new Error("Social insights cursor query returned an unexpected setting key.");
  }
  if (row.value === null || row.value === undefined) return null;
  if (!isValidCursor(row.value)) {
    throw new Error("Stored social insights cursor is invalid; refusing to restart an incomplete scan.");
  }
  return {
    createdAt: row.value.createdAt.trim(),
    id: row.value.id.trim(),
  };
}

export async function writeSocialInsightsScanCursor(
  platform: SocialInsightsScanPlatform,
  cursor: SocialInsightsScanCursor | null,
  request: SocialInsightsScanRequest = supabaseServerAdminRequest,
): Promise<void> {
  if (cursor !== null && !isValidCursor(cursor)) {
    throw new Error("Refusing to persist an invalid social insights cursor.");
  }
  const key = cursorKey(platform);
  await request<unknown>(
    "/rest/v1/admin_settings?on_conflict=key",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        key,
        value: cursor,
        description: "Private round-robin cursor for bounded social insights queue scans.",
        updated_at: new Date().toISOString(),
      }),
    },
  );
}
