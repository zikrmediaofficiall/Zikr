import { ADMIN_NAVIGATION } from "@/features/admin/config/navigation";

export type AdminSidebarSection = {
  key: string;
  label: string;
  icon: string;
  hrefs: readonly string[];
};

/**
 * ترتيب العرض في الشريان الجانبي فقط. ADMIN_NAVIGATION يبقى سجل الملكية والصلاحيات،
 * وهذا الملف يحدد كيف تُجمّع الصفحات للمشرف. أي صفحة غير مذكورة هنا تظهر تلقائيًا
 * في قسم "أخرى" حتى لا تختفي صفحة من القائمة.
 */
export const ADMIN_SIDEBAR_LAYOUT: readonly AdminSidebarSection[] = [
  { key: "overview", label: "نظرة عامة", icon: "activity", hrefs: ["/admin", "/admin/omnis", "/admin/queues", "/admin/notifications", "/admin/health"] },
  { key: "content", label: "المحتوى", icon: "file-text", hrefs: ["/admin/content", "/admin/library", "/admin/editorial", "/admin/categories", "/admin/sections", "/admin/search"] },
  { key: "knowledge", label: "المعرفة والمصادر", icon: "book-open", hrefs: ["/admin/sources", "/admin/knowledge", "/admin/prophets", "/admin/battles"] },
  {
    key: "video",
    label: "الفيديو",
    icon: "clapperboard",
    hrefs: [
      "/admin/video", "/admin/video/requests", "/admin/video/review", "/admin/video/studio", "/admin/video/clips", "/admin/video/studio/curated",
      "/admin/video/sources", "/admin/video/scripts", "/admin/video/voices", "/admin/video/visuals", "/admin/video/assets", "/admin/video/templates",
      "/admin/video/qa", "/admin/video/performance", "/admin/omnis/video-pipeline",
    ],
  },
  { key: "audio-media", label: "الصوت والوسائط", icon: "volume-2", hrefs: ["/admin/audio", "/admin/audio/quran", "/admin/audio/adhan", "/admin/audio/tts", "/admin/site-audio", "/admin/memory"] },
  { key: "publishing-growth", label: "النشر والنمو", icon: "send", hrefs: ["/admin/social", "/admin/social/written-studio", "/admin/omnis/push", "/admin/analytics", "/admin/seo", "/admin/omnis/growth", "/admin/omnis/experience"] },
  { key: "kids", label: "عالم الأطفال", icon: "baby", hrefs: ["/admin/kids", "/admin/kids/content", "/admin/kids/games", "/admin/kids/levels", "/admin/kids/assets", "/admin/kids/analytics"] },
  {
    key: "omnis-automation",
    label: "أومنيس والأتمتة",
    icon: "workflow",
    hrefs: ["/admin/omnis/project", "/admin/omnis/studio", "/admin/omnis/pages", "/admin/omnis/workflows", "/admin/automation", "/admin/omnis/agents", "/admin/omnis/database", "/admin/omnis/code", "/admin/omnis/cloud"],
  },
  { key: "system", label: "النظام والأمان", icon: "shield", hrefs: ["/admin/audit", "/admin/release", "/admin/users", "/admin/security", "/admin/android", "/admin/settings"] },
];

export type AdminSidebarGroup = {
  key: string;
  group: string;
  icon: string;
  items: { href: string; label: string; icon: string; permission: string }[];
};

/** يبني مجموعات الشريط الجانبي من السجل، دون إسقاط أي مسار ودون تكراره. */
export function buildSidebarGroups(): AdminSidebarGroup[] {
  const registry = new Map(ADMIN_NAVIGATION.flatMap((group) => group.items).map((item) => [item.href, item] as const));
  const placed = new Set<string>();
  const groups: AdminSidebarGroup[] = ADMIN_SIDEBAR_LAYOUT.map((section) => ({
    key: section.key,
    group: section.label,
    icon: section.icon,
    items: section.hrefs.flatMap((href) => {
      const item = registry.get(href);
      if (!item || placed.has(href)) return [];
      placed.add(href);
      return [{ href: item.href, label: item.label, icon: item.icon, permission: item.permission }];
    }),
  }));
  const rest = [...registry.values()].filter((item) => !placed.has(item.href));
  if (rest.length) {
    groups.push({
      key: "other",
      group: "أخرى",
      icon: "folder-open",
      items: rest.map((item) => ({ href: item.href, label: item.label, icon: item.icon, permission: item.permission })),
    });
  }
  return groups;
}
