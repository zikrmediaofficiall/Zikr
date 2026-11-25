import { existsSync, readFileSync } from "node:fs";
import { ADMIN_MODULES } from "../src/features/admin/config/modules";
import { ADMIN_NAVIGATION } from "../src/features/admin/config/navigation";
import { ADMIN_ROLE_PERMISSIONS } from "../src/features/admin/services/permissions";

const failures: string[] = [];
if (ADMIN_MODULES.length !== ADMIN_NAVIGATION.length) {
  failures.push("Admin module catalog and canonical navigation must have the same number of groups.");
}
for (const group of ADMIN_NAVIGATION) {
  const adminModule = ADMIN_MODULES.find((item) => item.key === group.key);
  if (!adminModule) {
    failures.push(`Missing module owner record for navigation group: ${group.key}`);
    continue;
  }
  const routePaths = group.items.map((item) => item.href);
  if (adminModule.routes.join("|") !== routePaths.join("|")) {
    failures.push(`Module routes drifted from canonical navigation: ${group.key}`);
  }
  if (!adminModule.permissions.includes(adminModule.permission)) {
    failures.push(`Primary permission must be included in module permissions: ${group.key}`);
  }
  for (const item of group.items) {
    if (!adminModule.permissions.includes(item.permission)) {
      failures.push(`Module permission list does not cover ${item.href}: ${item.permission}`);
    }
  }
  const ownerPermissions = ADMIN_ROLE_PERMISSIONS[adminModule.ownerRole as keyof typeof ADMIN_ROLE_PERMISSIONS];
  if (!ownerPermissions) {
    failures.push(`Unknown owner role for module ${group.key}: ${adminModule.ownerRole}`);
  } else {
    for (const permission of adminModule.permissions) {
      if (!ownerPermissions.includes(permission)) {
        failures.push(`Owner role ${adminModule.ownerRole} cannot cover ${permission} in module ${group.key}`);
      }
    }
  }
}
const seoManagerPermissions = ADMIN_ROLE_PERMISSIONS.seo_manager;
if (seoManagerPermissions.includes("settings.manage")) {
  failures.push("seo_manager must not receive settings.manage; global admin settings include security controls.");
}
if (!seoManagerPermissions.includes("site.metadata.manage")) {
  failures.push("seo_manager must retain the dedicated public site metadata permission.");
}

const kidsModule = ADMIN_MODULES.find((item) => item.key === "kids");
if (!kidsModule?.sourceTables.includes("kids_game_questions")) {
  failures.push("Kids module ownership inventory must include the restricted-answer kids_game_questions table.");
}
const kidsActions = readFileSync("src/app/admin/kids/actions.ts", "utf8");
for (const requiredGuard of [
  'requireAdminPermission("kids.manage")',
  'requireAdminStepUp("content.publish"',
  'requireAdminPermission("media.manage")',
]) {
  if (!kidsActions.includes(requiredGuard)) {
    failures.push("Kids content Server Actions must enforce the independent kids, publish, and media permissions: " + requiredGuard);
  }
}

const seen = new Set<string>();
for (const adminModule of ADMIN_MODULES) {
  if (seen.has(adminModule.key)) failures.push(`Duplicate admin module key: ${adminModule.key}`);
  seen.add(adminModule.key);
  if (!adminModule.basePath.startsWith("/admin")) failures.push(`Invalid module path: ${adminModule.basePath}`);
  if (!adminModule.sourceTables.length) failures.push(`Module has no declared source tables: ${adminModule.key}`);
}
const retiredAdminRouteFiles = [
  "src/app/admin/videos/page.tsx",
  "src/app/admin/video-factory/page.tsx",
  "src/app/admin/video-factory/sources/page.tsx",
  "src/app/admin/video-factory/scripts/page.tsx",
  "src/app/admin/video-factory/voices/page.tsx",
  "src/app/admin/video-factory/visuals/page.tsx",
  "src/app/admin/video-factory/templates/page.tsx",
  "src/app/admin/video-factory/qa/page.tsx",
  "src/app/admin/video-factory/queue/page.tsx",
  "src/app/admin/video-factory/scheduler/page.tsx",
  "src/app/admin/video-factory/publishing/page.tsx",
  "src/app/admin/ai-video/page.tsx",
  "src/app/admin/ai-video/curated/page.tsx",
  "src/app/admin/social/youtube-import/page.tsx",
  "src/app/admin/alerts/page.tsx",
  "src/app/admin/control/page.tsx",
  "src/app/admin/media/page.tsx",
  "src/app/admin/audio/site-audio/page.tsx",
];
for (const retiredPath of retiredAdminRouteFiles) {
  if (existsSync(retiredPath)) failures.push("Retired admin compatibility route must be deleted: " + retiredPath);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`❌ ${failure}`));
  process.exit(1);
}
console.log(`✅ Admin module registry passed: ${ADMIN_MODULES.length} modules, canonical navigation ownership, no legacy route files, and owner-role permission coverage.`);
