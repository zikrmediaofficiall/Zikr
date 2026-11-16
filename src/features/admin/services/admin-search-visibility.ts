import {
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/features/admin/services/permissions";

export const ADMIN_SEARCH_SOURCE_PERMISSIONS = {
  articles: "content.manage",
  stories: "content.manage",
  videos: "video.manage",
  hadiths: "knowledge.manage",
  duas: "knowledge.manage",
  content_library: "library.manage",
} as const satisfies Record<string, AdminPermission>;

export type AdminSearchSourceKey = keyof typeof ADMIN_SEARCH_SOURCE_PERMISSIONS;

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
