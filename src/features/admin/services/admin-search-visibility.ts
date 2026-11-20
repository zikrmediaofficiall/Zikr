import {
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/features/admin/services/permissions";
import { isGeneralAudienceVideoMetadata } from "@/features/videos/services/video-audience-visibility";

export const ADMIN_SEARCH_ACCESS_PERMISSIONS = [
  "content.manage",
  "video.manage",
  "knowledge.manage",
  "library.manage",
] as const satisfies readonly AdminPermission[];

export const ADMIN_SEARCH_SOURCE_PERMISSIONS = {
  articles: "content.manage",
  stories: "content.manage",
  videos: "video.manage",
  hadiths: "knowledge.manage",
  duas: "knowledge.manage",
  content_library: "library.manage",
} as const satisfies Record<string, AdminPermission>;

export type AdminSearchSourceKey = keyof typeof ADMIN_SEARCH_SOURCE_PERMISSIONS;

/** Video search must apply the separate Kids permission before returning metadata or titles. */
export function canSearchAdminVideoMetadata(metadata: unknown, role: AdminRole): boolean {
  return hasAdminPermission(role, "kids.manage") || isGeneralAudienceVideoMetadata(metadata);
}

/**
 * Admin search runs with the service role, so source-level permissions must be
 * applied before any query is issued. Hiding results only in the UI is not a
 * sufficient authorization boundary.
 */
export function getVisibleAdminSearchSourceKeys(
  role: AdminRole,
): AdminSearchSourceKey[] {
  return (Object.keys(ADMIN_SEARCH_SOURCE_PERMISSIONS) as AdminSearchSourceKey[])
    .filter((source) =>
      hasAdminPermission(role, ADMIN_SEARCH_SOURCE_PERMISSIONS[source]),
    );
}


export function getAdminSearchResultHref(item: {
  type: string;
  slug: string | null;
  published: boolean;
}): string {
  if (item.type === "مقال" && item.slug) {
    return item.published ? `/articles/${encodeURIComponent(item.slug)}` : "/admin/content";
  }
  if (item.type === "قصة" && item.slug) {
    return item.published ? `/stories/${encodeURIComponent(item.slug)}` : "/admin/content";
  }
  if (item.type === "فيديو") {
    // The admin video catalog includes drafts and Kids-only entries that public routes intentionally hide.
    return "/admin/video";
  }
  if (item.type === "حديث" || item.type === "دعاء") return "/admin/knowledge";
  return "/admin/content";
}

/** Canonical child-directed video category slugs, aligned with the public RLS guard. */
const KIDS_VIDEO_CATEGORY_SLUGS = new Set([
  "kids-stories",
  "kids-story",
  "kids_story",
  "kids_video",
  "kids",
  "kid",
  "children",
  "child",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isKidsVideoCategorySlug(value: unknown): boolean {
  return typeof value === "string" && KIDS_VIDEO_CATEGORY_SLUGS.has(value.trim().toLowerCase());
}

/**
 * Returns null for an invalid category response so callers can fail closed.
 * An empty array is valid and means the category lookup succeeded with no Kids categories.
 */
export function resolveKidsVideoCategoryIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !UUID_PATTERN.test(row.id) || typeof row.slug !== "string" || !row.slug.trim()) {
      return null;
    }
    if (isKidsVideoCategorySlug(row.slug)) ids.push(row.id);
  }
  return [...new Set(ids)];
}

/** Category membership is authoritative even when legacy metadata is missing or contradictory. */
export function canSearchAdminVideoRow(
  row: { category_id?: unknown; metadata?: unknown },
  role: AdminRole,
  kidsCategoryIds: readonly string[],
): boolean {
  if (hasAdminPermission(role, "kids.manage")) return true;
  const categoryId = typeof row.category_id === "string" ? row.category_id : "";
  if (categoryId && kidsCategoryIds.includes(categoryId)) return false;
  return canSearchAdminVideoMetadata(row.metadata, role);
}
