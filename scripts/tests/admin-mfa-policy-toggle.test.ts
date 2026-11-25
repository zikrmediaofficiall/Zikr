import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldRequireAdminStepUp } from "../../src/features/admin/services/security-policy";
import { getEditableAdminSettingDefinition } from "../../src/features/admin/config/settings-registry";

const read = (path: string) => readFileSync(path, "utf8");
const security = read("src/features/admin/services/security.ts");
const actions = read("src/app/admin/system-actions.ts");

assert.equal(shouldRequireAdminStepUp(false), false, "ordinary destructive actions may follow an explicit disabled policy");
assert.equal(shouldRequireAdminStepUp(true), true, "an enabled policy must require AAL2");
assert.equal(shouldRequireAdminStepUp(false, true), true, "the policy toggle itself must always require AAL2");

assert.match(
  security,
  /requireAdminStepUp\(permission: AdminPermission, nextPath = ["']\/admin["'], forceMfa = false\)/,
  "the server-action guard must support an unconditional step-up override",
);
assert.match(
  security,
  /requireAdminStepUpApi\([\s\S]*?forceMfa = false/,
  "the API guard must support the same unconditional step-up override",
);
assert.equal(
  (security.match(/shouldRequireAdminStepUp\(await destructiveMfaRequired\(\), forceMfa\)/g) ?? []).length,
  2,
  "both page and API guards must honor the force flag",
);

assert.equal(
  getEditableAdminSettingDefinition("require_mfa_for_destructive")?.stepUpPolicy,
  "always",
  "changing the destructive-MFA policy must always require AAL2",
);
assert.equal(
  getEditableAdminSettingDefinition("maintenance_mode")?.stepUpPolicy,
  "policy",
  "maintenance mode must follow the configured AAL2 policy",
);
assert.equal(
  getEditableAdminSettingDefinition("admin_alerts_enabled")?.stepUpPolicy,
  "policy",
  "admin alerts must follow the configured AAL2 policy",
);
assert.match(
  actions,
  /definition\.stepUpPolicy === "always"[\s\S]*?requireAdminStepUp\(definition\.permission, "\/admin\/settings", true\)/,
  "the generic settings action must enforce always-step-up definitions",
);
assert.match(
  actions,
  /definition\.stepUpPolicy === "policy"[\s\S]*?requireAdminStepUp\(definition\.permission, "\/admin\/settings"\)/,
  "the generic settings action must enforce policy-controlled step-up definitions",
);
assert.match(
  actions,
  /const validation = validateAdminSettingValue\(key, rawValue\)[\s\S]*?if \(!validation\.ok\) throw new Error\(validation\.error\)/,
  "generic settings writes must use the shared typed validator before persistence",
);
assert.match(
  actions,
  /createAdminNotificationAction[\s\S]*?requireAdminStepUp\("notifications\.manage", "\/admin\/notifications"\)/,
  "global admin notification broadcasts must follow the configured step-up policy",
);
assert.ok(
  actions.indexOf("const profile = definition.stepUpPolicy === \"always\"") <
    actions.indexOf('await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key"'),
  "step-up authorization must precede the privileged settings mutation",
);
assert.match(
  actions,
  /if \(key === "video_automation_enabled"\)[\s\S]*?isVideoPurgeLockResponseActive\(purgeRows\)/,
  "the video-generation lock must remain enforced while writes use the registry",
);
assert.match(
  actions,
  /await requireAdminStepUp\(definition\.permission, "\/admin\/automation", true\)/,
  "video setting writes must retain mandatory step-up",
);

console.log("Admin MFA policy-toggle step-up regression passed.");
