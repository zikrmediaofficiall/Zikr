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
