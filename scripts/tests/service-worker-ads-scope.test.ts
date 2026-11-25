import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";

import { getServiceWorkerScriptUrl } from "../../src/lib/ads/runtime-policy";
import { PRODUCTION_URL } from "../../src/lib/site";

const productionOrigin = new URL(PRODUCTION_URL).origin;

assert.equal(productionOrigin, "https://zikrmediaofficial.vercel.app");
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: true,
    origin: productionOrigin,
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js?native=1",
);
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: productionOrigin,
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
);
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: "https://zikr-git-preview.vercel.app",
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
);
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: "https://zikrmediaofficial.vercel.app.evil",
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
);
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: "http://localhost:3000",
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
);

assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: "https://zikrmediaofficial.vercel.app:8443",
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
  "a non-default port on the canonical hostname is not the canonical production origin",
);
assert.equal(
  getServiceWorkerScriptUrl({
    isNative: false,
    origin: "http://zikrmediaofficial.vercel.app",
    productionUrl: PRODUCTION_URL,
  }),
  "/sw.js",
  "an HTTP origin must not receive the Monetag-enabled worker",
);

const worker = readFileSync("public/sw.js", "utf8");
assert.ok(worker.includes('searchParams.get("native") === "1"'));
assert.ok(!worker.includes("monetag=1") && !worker.includes("importScripts('https://5gvci.com"));
assert.ok(
  worker.includes('serviceWorkerLocation.origin === "https://zikrmediaofficial.vercel.app"'),
  "the worker must enforce the exact canonical HTTPS origin, including its port",
);
assert.ok(
  !worker.includes('serviceWorkerLocation.hostname.toLowerCase() === "zikrmediaofficial.vercel.app"'),
  "hostname-only checks must not re-enable advertising on alternate origins",
);
assert.ok(worker.includes("if (isCanonicalWebWorker) return;"));
assert.ok(worker.includes("await purgeDisabledAdvertisingMarkup()"));

const register = readFileSync("src/components/layout/service-worker-register.tsx", "utf8");
assert.match(
  register,
  /registration\.update\(\)\.catch\(/,
  "periodic service-worker update failures must be handled rather than becoming unhandled rejections",
);
const webAdsRuntime = readFileSync("src/components/layout/web-advertising-runtime.tsx", "utf8");
const adsenseSlot = readFileSync("src/components/layout/adsense-slot.tsx", "utf8");
const searchConsoleVerifier = readFileSync("scripts/verify-google-search-console.mjs", "utf8");
const consentModeVerifier = readFileSync("scripts/verify-consent-mode.mjs", "utf8");
assert.ok(
  consentModeVerifier.includes("if (!isCanonicalProductionOrigin())"),
  "Consent Mode verification must require the exact canonical origin before analytics injection",
);
assert.ok(
  !consentModeVerifier.includes("isCanonicalProductionHost"),
  "Consent Mode verification must not regress to hostname-only production checks",
);
assert.ok(
  searchConsoleVerifier.includes("if (!isCanonicalProductionOrigin())"),
  "Search Console verification must enforce the exact canonical origin before publisher-script injection",
);
assert.ok(
  !searchConsoleVerifier.includes("isCanonicalProductionHost"),
  "Search Console verification must not regress to hostname-only advertising checks",
);
const runtimeEffects = readFileSync("src/components/layout/runtime-effects.tsx", "utf8");
assert.ok(
  runtimeEffects.includes("window.location.origin === new URL(PRODUCTION_URL).origin"),
  "deferred AdSense scripts must require the exact canonical HTTPS origin, including its port",
);
assert.ok(
  !runtimeEffects.includes("window.location.hostname"),
  "deferred AdSense scripts must not use a hostname-only production gate",
);
const integrityVerifier = readFileSync("scripts/verify-project-integrity.mjs", "utf8");
assert.ok(
  integrityVerifier.includes("'window.location.origin'"),
  "project integrity must verify the origin-aware service-worker registration",
);
assert.ok(
  integrityVerifier.includes("'serviceWorkerLocation.origin === \"https://zikrmediaofficial.vercel.app\"'"),
  "project integrity must verify the exact canonical service-worker origin",
);
assert.ok(
  !integrityVerifier.includes("'window.location.hostname'") &&
    !integrityVerifier.includes("'hostname.toLowerCase() === \"zikrmediaofficial.vercel.app\"'"),
  "project integrity must not regress to hostname-only advertising gates",
);

assert.ok(webAdsRuntime.includes("window.location.origin === new URL(PRODUCTION_URL).origin"));
assert.ok(adsenseSlot.includes("window.location.origin === new URL(PRODUCTION_URL).origin"));


const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
assert.ok(
  !rootLayout.includes('name="google-adsense-account"') &&
    !rootLayout.includes("google-consent-mode-default") &&
    !rootLayout.includes("window.adsbygoogle") &&
    !rootLayout.includes("requestNonPersonalizedAds = 1"),
  "the server-rendered root layout must not emit AdSense publisher metadata or Consent Mode globals into native HTML",
);
const nativeGuardIndex = webAdsRuntime.indexOf("if (Capacitor.isNativePlatform())");
const canonicalGuardIndex = webAdsRuntime.indexOf("if (!isCanonicalProductionOrigin())");
const consentDefaultIndex = webAdsRuntime.indexOf("installConsentModeDefaults();");
assert.ok(!webAdsRuntime.includes("tag.min.js"), "third-party Monetag tags must not be injected");
const fundingChoicesIndex = webAdsRuntime.indexOf('"google-funding-choices"');
const tagManagerIndex = webAdsRuntime.indexOf('"google-tag-manager"');
assert.ok(
  nativeGuardIndex >= 0 &&
    canonicalGuardIndex > nativeGuardIndex &&
    consentDefaultIndex > canonicalGuardIndex &&
    consentDefaultIndex < fundingChoicesIndex &&
    consentDefaultIndex < tagManagerIndex,
  "Consent Mode defaults must be installed only after native and canonical-origin guards, before any web ad/analytics tags",
);
for (const token of [
  "ad_storage: 'denied'",
  "analytics_storage: 'denied'",
  "ad_user_data: 'denied'",
  "ad_personalization: 'denied'",
  "personalization_storage: 'denied'",
  "ads_data_redaction",
  "requestNonPersonalizedAds = 1",
]) {
  assert.ok(webAdsRuntime.includes(token), "web-only Consent Mode default missing: " + token);
}
assert.ok(
  webAdsRuntime.includes('script#google-consent-mode-default'),
  "native cleanup must remove a legacy server-rendered Consent Mode script",
);

console.log("Service-worker advertising scope contract passed.");


const prayerCacheHelper = readFileSync("public/sw-prayer-times-cache.js", "utf8");
type PrayerCacheResponse = { clone: () => { json: () => Promise<unknown> } };
type PrayerCacheFreshness = (
  response: PrayerCacheResponse,
  requestUrl: string | URL,
  now?: Date,
) => Promise<boolean>;
const prayerCacheSandbox = {
  self: {
    location: { origin: productionOrigin },
    isFreshPrayerTimesCacheEntry: undefined as unknown as PrayerCacheFreshness,
  },
  URL,
  Intl,
  Date,
};
runInNewContext(prayerCacheHelper, prayerCacheSandbox);
const isFreshPrayerTimesCacheEntry = prayerCacheSandbox.self.isFreshPrayerTimesCacheEntry;
const makePrayerResponse = (date: string, timeZone = "Africa/Cairo") => ({
  clone: () => ({
    json: async () => ({
      data: {
        date: { gregorian: { date } },
        meta: { timezone: timeZone },
      },
    }),
  }),
});
const fixedPrayerNow = new Date("2026-11-17T12:00:00.000Z");
const todayPrayerUrl = new URL("/api/prayer-times?latitude=31.2&longitude=29.9", productionOrigin);
assert.equal(
  await isFreshPrayerTimesCacheEntry(makePrayerResponse("17-11-2026"), todayPrayerUrl, fixedPrayerNow),
  true,
  "a cached response for the current Gregorian date in its provider timezone may be used offline",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(makePrayerResponse("16-11-2026"), todayPrayerUrl, fixedPrayerNow),
  false,
  "a yesterday response without an explicit date must not be returned as today's prayer times",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(
    makePrayerResponse("16-11-2026", "America/Los_Angeles"),
    todayPrayerUrl,
    new Date("2026-11-17T01:00:00.000Z"),
  ),
  true,
  "freshness must use the provider's location timezone rather than the device date",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(
    makePrayerResponse("17-11-2026", "America/Los_Angeles"),
    todayPrayerUrl,
    new Date("2026-11-17T01:00:00.000Z"),
  ),
  false,
  "a UTC/device date match must not override a different local date in the prayer location",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(
    makePrayerResponse("18-11-2026", "Asia/Tokyo"),
    todayPrayerUrl,
    new Date("2026-11-17T16:00:00.000Z"),
  ),
  true,
  "locations east of UTC must use their own next calendar day",
);
const explicitPrayerDateUrl = new URL(
  "/api/prayer-times?latitude=31.2&longitude=29.9&date=2026-11-16",
  productionOrigin,
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(makePrayerResponse("16-11-2026"), explicitPrayerDateUrl, fixedPrayerNow),
  true,
  "an explicitly requested historical date remains a valid cache key after the current day changes",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(makePrayerResponse("17-11-2026"), explicitPrayerDateUrl, fixedPrayerNow),
  false,
  "a cached response for a different explicit date must be rejected",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry(makePrayerResponse("17-11-2026", "Invalid/Timezone"), todayPrayerUrl, fixedPrayerNow),
  false,
  "an invalid provider timezone must fail closed",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry({ clone: () => ({ json: async () => ({ data: {} }) }) }, todayPrayerUrl, fixedPrayerNow),
  false,
  "missing Gregorian date metadata must fail closed",
);
assert.equal(
  await isFreshPrayerTimesCacheEntry({ clone: () => ({ json: async () => { throw new Error("invalid JSON"); } }) }, todayPrayerUrl, fixedPrayerNow),
  false,
  "malformed cached JSON must fail closed",
);

const prayerHandlerStart = worker.indexOf('if (url.pathname === "/api/prayer-times")');
const publicApiHandlerStart = worker.indexOf("if (isPublicContentApi(url))", prayerHandlerStart);
assert.ok(prayerHandlerStart >= 0 && publicApiHandlerStart > prayerHandlerStart);
const prayerHandler = worker.slice(prayerHandlerStart, publicApiHandlerStart);
assert.ok(
  worker.indexOf('importScripts("/sw-prayer-times-cache.js")') < prayerHandlerStart,
  "the freshness helper must load before the service worker handles prayer-time requests",
);
assert.match(prayerHandler, /await self\.isFreshPrayerTimesCacheEntry\(response\.clone\(\), url\)/);
assert.match(prayerHandler, /await self\.isFreshPrayerTimesCacheEntry\(cached\.clone\(\), url\)/);
assert.match(prayerHandler, /await cache\.delete\(request\)/);
assert.match(prayerHandler, /Offline prayer-times data is unavailable or expired/);

console.log("Service-worker prayer-times cache freshness contract passed.");
