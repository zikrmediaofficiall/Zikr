import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getIosAssociatedDomainAppIdStatus } from "../lib/ios-associated-domain-contract.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const aasa = read("../../src/app/.well-known/apple-app-site-association/route.ts");
const assetLinks = read("../../src/app/.well-known/assetlinks.json/route.ts");
const androidManifest = read("../../android/app/src/main/AndroidManifest.xml");
const proxySource = read("../../src/proxy.ts");
const proxyMatcher = proxySource.slice(proxySource.indexOf("export const config"));
assert.ok(proxyMatcher.includes("\\\\.well-known/"), "public Apple/Android association endpoints must bypass Supabase session lookup in the proxy");
const isForceStaticRoute = (source) =>
  /export\s+const\s+dynamic\s*=\s*(['"])force-static\1;/.test(source);

assert.ok(aasa.includes("process.env.IOS_ASSOCIATED_DOMAIN_APP_ID"));

assert.deepEqual(
  getIosAssociatedDomainAppIdStatus({ appId: "", vercelEnv: "production" }).status,
  "fail",
  "the production iOS store-release gate must not pass while the Apple Team ID/bundle ID is missing",
);
assert.deepEqual(
  getIosAssociatedDomainAppIdStatus({ appId: "", vercelEnv: "production", required: false }).status,
  "warn",
  "a normal production web build must warn, not fail, when the optional Apple association ID is absent",
);
assert.deepEqual(
  getIosAssociatedDomainAppIdStatus({ appId: "", vercelEnv: "preview" }).status,
  "warn",
  "preview builds may remain usable without production Universal Links configuration",
);
assert.deepEqual(
  getIosAssociatedDomainAppIdStatus({ appId: "ABCDEFGHIJ.com.zikr.app", vercelEnv: "production" }).status,
  "pass",
);
assert.deepEqual(
  getIosAssociatedDomainAppIdStatus({ appId: "invalid.com.zikr.app", vercelEnv: "production" }).status,
  "fail",
  "production must reject an invalid Apple app identifier",
);
const webBuildGuard = read("../verify-ios-associated-domain.mjs");
assert.ok(webBuildGuard.includes("required: false"), "the shared web build must not fail because an optional iOS-only association ID is absent");
const deploymentEnvValidator = read("../validate-deployment-env.mjs");
assert.ok(deploymentEnvValidator.includes("required: false"), "the web deployment environment audit must report the missing iOS ID as a warning");
const mobileReadiness = read("../verify-mobile-readiness.mjs");
assert.ok(
  mobileReadiness.includes('vercelEnv: "production"') &&
    mobileReadiness.includes("getIosAssociatedDomainAppIdStatus"),
  "the iOS store-release readiness gate must retain the strict production App ID requirement",
);
const packageJson = JSON.parse(read("../../package.json"));
assert.ok(
  packageJson.scripts.prebuild.includes("scripts/verify-ios-associated-domain.mjs"),
  "the Vercel production build must run the Apple association environment guard",
);
assert.ok(
  webBuildGuard.includes("getIosAssociatedDomainAppIdStatus"),
  "the build guard must use the shared iOS association contract",
);
assert.ok(assetLinks.includes("process.env.ANDROID_APP_LINKS_SHA256"));
assert.ok(assetLinks.includes("CURRENT_RELEASE_FINGERPRINT"));
assert.ok(isForceStaticRoute(aasa), "iOS association route must be force-static");
assert.ok(isForceStaticRoute(assetLinks), "Android association route must be force-static");

const publicAppLinkPrefixes = ["/quran", "/hadith", "/articles", "/dua", "/stories", "/kids"];
for (const prefix of publicAppLinkPrefixes) {
  assert.ok(aasa.includes(`{ '/': '${prefix}' }`), `iOS Universal Links must include the public route root ${prefix}`);
  assert.ok(aasa.includes(`{ '/': '${prefix}/*' }`), `iOS Universal Links must include nested public routes under ${prefix}`);
  assert.ok(androidManifest.includes(`android:pathPrefix="${prefix}"`), `Android App Links must include ${prefix}`);
}
assert.ok(aasa.includes("{ '/': '/duas' }"), "iOS Universal Links must include the legacy /duas alias before its server redirect to /dua");
assert.doesNotMatch(
  aasa,
  /\{\s*['"]\/['"]\s*:\s*['"]\/\*['"]\s*\}/,
  "iOS Universal Links must not use a catch-all that associates admin/API/technical routes with the consumer app",
);
assert.match(
  aasa,
  /['"]\/auth\/callback\*['"][^}]*exclude:\s*true/,
  "the HTTPS OAuth callback must remain excluded from Universal Links",
);

const iosProject = read("../../ios/App/App.xcodeproj/project.pbxproj");
const debugEntitlements = read("../../ios/App/App/AppDebug.entitlements");
const releaseEntitlements = read("../../ios/App/App/App.entitlements");
const entitlementsBindings = [...iosProject.matchAll(/CODE_SIGN_ENTITLEMENTS = ([^;]+);/g)].map((match) => match[1]);
assert.deepEqual(
  entitlementsBindings,
  ["App/AppDebug.entitlements", "App/App.entitlements"],
  "iOS Debug and Release must use separate APNs entitlement environments",
);
assert.match(debugEntitlements, /<key>aps-environment<\/key>\s*<string>development<\/string>/);
assert.match(releaseEntitlements, /<key>aps-environment<\/key>\s*<string>production<\/string>/);
for (const source of [debugEntitlements, releaseEntitlements]) {
  assert.ok(source.includes("applinks:zikrmediaofficial.vercel.app"), "both build configurations must retain the Universal Links entitlement");
}


console.log("App association route contract passed.");
