import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const registry = read("src/features/admin/config/settings-registry.ts");
const migration = read("supabase/migrations/20261125084000_zikr_admin_setting_versions.sql");
const versionService = read("src/features/admin/services/setting-versions.ts");
const versionPanel = read("src/features/admin/components/admin-setting-version-history.tsx");
const actions = read("src/app/admin/system-actions.ts");
const settingsPage = read("src/app/admin/settings/page.tsx");
const automationPage = read("src/app/admin/automation/page.tsx");
const supabaseTypes = read("src/lib/types/supabase.ts");

const editableKeys = [...registry.matchAll(/\{\n    editable: true,\n    key: "([^"]+)",/g)].map((match) => match[1]);
const expectedEditableKeys = [
  "require_mfa_for_destructive",
  "maintenance_mode",
  "admin_alerts_enabled",
  "search_result_limit",
  "video_automation_enabled",
  "video_automation_auto_publish",
  "video_automation_batch_size",
  "video_automation_ai_enabled",
  "video_automation_daily_target",
  "video_automation_ai_attempts_per_run",
  "video_automation_video_seconds",
];
assert.deepEqual([...new Set(editableKeys)].sort(), [...expectedEditableKeys].sort(), "versioning must cover exactly the 11 typed editable settings");

for (const key of expectedEditableKeys) {
  assert.ok(migration.includes(`'${key}'`), `database allow-list must contain ${key}`);
}
for (const internalKey of [
  "android_release_operation",
  "social_insights_scan_cursor_facebook_reels",
  "social_insights_scan_cursor_youtube",
  "video_purge_in_progress",
  "video_automation_run_now",
  "video_custom_spaces",
]) {
  assert.ok(!migration.includes(`'${internalKey}'`), `internal workflow state must not enter version history: ${internalKey}`);
}

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.admin_setting_versions/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /admin_setting_versions_client_deny[\s\S]*?USING \(false\)[\s\S]*?WITH CHECK \(false\)/);
assert.match(migration, /REVOKE ALL ON public\.admin_setting_versions FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT ALL ON public\.admin_setting_versions TO service_role/);
assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.admin_setting_versions/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /save_admin_setting_version/);
assert.match(migration, /restore_admin_setting_version/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_admin_setting_version[\s\S]*?TO service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.restore_admin_setting_version[\s\S]*?TO service_role/);
assert.match(migration, /ON CONFLICT \(setting_key\) WHERE operation = 'baseline' DO NOTHING/);
assert.match(migration, /admin_omnis_events_actor_user_idx/);
assert.match(migration, /admin_omnis_ledger_created_by_idx/);
assert.match(migration, /admin_omnis_ledger_updated_by_idx/);

assert.ok(versionService.includes("/rest/v1/rpc/save_admin_setting_version"));
assert.ok(versionService.includes("/rest/v1/rpc/restore_admin_setting_version"));
assert.ok(versionService.includes("getEditableAdminSettingDefinition"));
assert.ok(versionService.includes("UUID_PATTERN"));
assert.ok(versionService.includes("encodeURIComponent"));
assert.ok(!versionService.includes("SUPABASE_SERVICE_ROLE_KEY"), "service credentials must remain in the shared server transport");

assert.ok(actions.includes("saveAdminSettingVersion({ key, value, actorUserId: profile.id })"));
assert.ok(actions.includes("restoreAdminSettingVersion({ versionId, actorUserId: profile.id })"));
assert.ok(actions.includes('await requireAnyAdminPermission(["settings.manage", "system.manage"]);'), "setting history lookup must require an authorized admin domain before reading version metadata");
assert.ok(!actions.includes('await requireAdminPermission("admin.access");'), "generic admin access alone must not expose setting version history");
assert.ok(actions.includes("requireAdminStepUp(definition.permission"), "restoring settings must honor the owner permission and MFA policy");
assert.ok(actions.includes('action: "admin.settings.restore"'));
assert.ok(actions.includes("recordAdminAuditEventSafely"));

assert.ok(settingsPage.includes("getAdminSettingVersionHistory"));
assert.ok(settingsPage.includes("AdminSettingVersionHistoryPanel"));
assert.ok(automationPage.includes("getAdminSettingVersionHistory"));
assert.ok(automationPage.includes("AdminSettingVersionHistoryPanel"));
assert.ok(versionPanel.includes("restoreAdminSettingVersionAction"));
assert.ok(versionPanel.includes("نسخة جديدة مرتبطة بالنسخة المستعادة"));

assert.ok(supabaseTypes.includes("admin_setting_versions:"));
assert.ok(supabaseTypes.includes("restore_admin_setting_version:"));
assert.ok(supabaseTypes.includes("save_admin_setting_version:"));

console.log("Admin setting versioning contracts passed: typed allow-list, RLS/service-only writes, append-only history, atomic save/restore RPCs, audited MFA-protected actions, history UI, and schema types.");
