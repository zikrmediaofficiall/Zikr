import assert from "node:assert/strict";
import {
  ADMIN_SETTING_REGISTRY,
  getAdminSettingDefinition,
  getEditableAdminSettingDefinition,
  validateAdminSettingValue,
} from "../../src/features/admin/config/settings-registry";

const keys = ADMIN_SETTING_REGISTRY.map((item) => item.key);
assert.equal(new Set(keys).size, keys.length, "registry keys must be unique");

const editable = ADMIN_SETTING_REGISTRY.filter((item) => item.editable);
assert.equal(editable.length, 11, "the registry must define the 11 supported editable settings");

for (const item of editable) {
  assert.ok(item.permission, `${item.key} must have an owner permission`);
  assert.ok(item.owner.length > 0, `${item.key} must have an owning domain`);
  assert.equal(item.storage, "public.admin_settings");
  assert.ok(item.revalidatePaths.length > 0, `${item.key} must declare cache paths`);
  if (item.valueType === "integer") {
    assert.ok(Number.isSafeInteger(item.runtimeFallback));
    assert.ok(item.runtimeFallback >= item.minimum && item.runtimeFallback <= item.maximum);
    assert.ok(item.minimum <= item.maximum);
  }
}

const booleanKeys = [
  "require_mfa_for_destructive",
  "maintenance_mode",
  "admin_alerts_enabled",
  "video_automation_enabled",
  "video_automation_auto_publish",
  "video_automation_ai_enabled",
] as const;
for (const key of booleanKeys) {
  assert.equal(validateAdminSettingValue(key, "true").ok, true, `${key} accepts true`);
  const falseResult = validateAdminSettingValue(key, "false");
  assert.equal(falseResult.ok, true, `${key} accepts false`);
  if (falseResult.ok) assert.equal(falseResult.value, false);
  assert.equal(validateAdminSettingValue(key, "1").ok, false, `${key} rejects non-boolean input`);
  assert.equal(validateAdminSettingValue(key, "").ok, false, `${key} rejects an empty value`);
}

const integerCases = [
  ["search_result_limit", 10, 100],
  ["video_automation_batch_size", 1, 10],
  ["video_automation_daily_target", 1, 24],
  ["video_automation_ai_attempts_per_run", 0, 4],
  ["video_automation_video_seconds", 10, 45],
] as const;
for (const [key, minimum, maximum] of integerCases) {
  assert.equal(validateAdminSettingValue(key, String(minimum)).ok, true, `${key} accepts min`);
  assert.equal(validateAdminSettingValue(key, String(maximum)).ok, true, `${key} accepts max`);
  assert.equal(validateAdminSettingValue(key, String(minimum - 1)).ok, false, `${key} rejects below min`);
  assert.equal(validateAdminSettingValue(key, String(maximum + 1)).ok, false, `${key} rejects above max`);
  assert.equal(validateAdminSettingValue(key, "1.5").ok, false, `${key} rejects decimals`);
  assert.equal(validateAdminSettingValue(key, "NaN").ok, false, `${key} rejects non-numeric input`);
}

const internalKeys = [
  "android_release_operation",
  "social_insights_scan_cursor_facebook_reels",
  "social_insights_scan_cursor_youtube",
  "video_purge_in_progress",
  "video_automation_run_now",
  "video_custom_spaces",
] as const;
for (const key of internalKeys) {
  const definition = getAdminSettingDefinition(key);
  assert.ok(definition, `${key} must be explicitly classified`);
  assert.equal(definition.editable, false, `${key} must remain read-only through generic setting forms`);
  assert.equal(getEditableAdminSettingDefinition(key), undefined);
  assert.equal(validateAdminSettingValue(key, "true").ok, false);
}

assert.equal(getAdminSettingDefinition("SUPABASE_SERVICE_ROLE_KEY"), undefined, "secret names do not enter the persisted settings registry");
assert.equal(getAdminSettingDefinition("unknown_admin_setting"), undefined);
const failClosed = getEditableAdminSettingDefinition("video_automation_enabled");
assert.ok(failClosed && failClosed.valueType === "boolean");
assert.equal(failClosed.runtimeFallback, false);
assert.equal(failClosed.missingValuePolicy, "fail-closed");

console.log("Admin settings typed registry and validation contracts passed.");
