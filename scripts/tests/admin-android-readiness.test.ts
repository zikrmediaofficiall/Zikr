import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/admin/android/page.tsx", "utf8");
const platform = readFileSync("src/features/admin/services/platform.ts", "utf8");
const verifier = readFileSync("scripts/verify-admin-health.mjs", "utf8");

for (const workflowPath of [
  ".github/workflows/android-release-signing-preflight.yml",
  ".github/workflows/sign-android-release-tag.yml",
  ".github/workflows/publish-android-release-assets.yml",
  ".github/workflows/android-native-login-test.yml",
]) {
  assert.ok(platform.includes(workflowPath), `Admin health must monitor ${workflowPath}`);
  assert.ok(verifier.includes(workflowPath), `Admin health verifier must retain ${workflowPath}`);
}
for (const workflowName of [
  "Android tag signing preflight",
  "Sign Android release tag",
  "Publish Android Release Assets",
  "ZIKR Android Native Login Debug APK",
]) {
  assert.ok(page.includes(workflowName), `Android readiness page must show ${workflowName}`);
}
assert.ok(page.includes("getAdminHealth()"));
assert.ok(page.includes("checkAndroidAssetLinks()"));
assert.ok(page.includes('package_name === "com.zikr.app"'));
assert.ok(page.includes('statement.relation.includes("delegate_permission/common.handle_all_urls")'));
assert.ok(page.includes('href="/admin/notifications"'));
assert.ok(page.includes("لا يوجد تشغيل حديث مسجل على main"));
assert.ok(page.includes("تعذر قراءة سجل GitHub Actions"));
assert.ok(page.includes("لا يتم اعتباره نجاحًا"));
assert.ok(page.includes("checkPushReadiness()"));
assert.ok(page.includes("get_push_vapid_public_key"));
assert.ok(page.includes("لا يعتبر ذلك نجاحًا"));
assert.doesNotMatch(page, /ANDROID_KEYSTORE_PASSWORD|ANDROID_KEYSTORE_BASE64|GPG_PRIVATE_KEY/);

console.log("Android release readiness display and workflow inventory contracts passed.");
