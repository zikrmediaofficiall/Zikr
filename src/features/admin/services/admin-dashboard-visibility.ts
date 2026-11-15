import {
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/features/admin/services/permissions";

export const ADMIN_DASHBOARD_COUNT_PERMISSIONS = {
  articles: "content.manage",
  stories: "content.manage",
  content_library: "library.manage",
  hadiths: "knowledge.manage",
  duas: "knowledge.manage",
  prophets: "prophets.manage",
  companions: "knowledge.manage",
  scholars: "knowledge.manage",
  quran_surahs: "audio.manage",
  quran_reciters: "audio.manage",
  quran_audio: "audio.manage",
  tawasheeh: "audio.manage",
  site_audio_assets: "audio.manage",
  kids_content: "kids.manage",
  kids_games: "kids.manage",
  kids_game_levels: "kids.manage",
  videos: "video.manage",
  media_assets: "media.manage",
  profiles: "users.read",
  video_generation_requests: "video.manage",
  admin_audit_events: "audit.read",
} as const satisfies Readonly<Record<string, AdminPermission>>;

export type AdminDashboardCountSection = {
  key: string;
  title: string;
  description: string;
  tables: readonly string[];
};

export function getVisibleAdminDashboardCountSections<
  TCount extends { table: string },
  TSection extends AdminDashboardCountSection,
>(
  role: AdminRole,
  sections: readonly TSection[],
  counts: readonly TCount[],
): Array<TSection & { values: TCount[] }> {
  return sections
    .map((section) => ({
      ...section,
      values: counts.filter((count) => {
        if (!section.tables.includes(count.table)) return false;
        const permission = ADMIN_DASHBOARD_COUNT_PERMISSIONS[
          count.table as keyof typeof ADMIN_DASHBOARD_COUNT_PERMISSIONS
        ];
        return permission ? hasAdminPermission(role, permission) : false;
      }),
    }))
    .filter((section) => section.values.length > 0);
}

export type AdminQueueStatusSnapshot = {
  counts: Record<string, number>;
  available: boolean;
} | null;

export type AdminQueueOverview = {
  unavailable: string[];
  videoGeneration: Record<string, number>;
  socialQueue: Record<string, number>;
  generatedAt: string;
};

/**
 * Keep the live overview API aligned with the same delegated-role boundaries
 * used by the dashboard count cards. Unauthorized or unavailable queues never
 * serialize their real counts into the browser response.
 */
export function buildAdminQueueOverview(
  role: AdminRole,
  video: AdminQueueStatusSnapshot,
  social: AdminQueueStatusSnapshot,
  generatedAt: string,
): AdminQueueOverview {
  const canReadVideo = hasAdminPermission(role, "video.manage");
  const canReadSocial = hasAdminPermission(role, "social.manage");
  const videoAvailable = canReadVideo && video?.available === true;
  const socialAvailable = canReadSocial && social?.available === true;
  const unavailable: string[] = [];

  if (!videoAvailable) unavailable.push("video_generation_requests");
  if (!socialAvailable) unavailable.push("social_publish_queue");

  return {
    unavailable,
    videoGeneration: videoAvailable && video ? video.counts : {},
    socialQueue: socialAvailable && social ? social.counts : {},
    generatedAt,
  };
}
