import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const layout = readFileSync('src/app/layout.tsx', 'utf8');
const webAdvertisingRuntime = readFileSync('src/components/layout/web-advertising-runtime.tsx', 'utf8');
const deferredAnalytics = readFileSync('src/components/layout/deferred-analytics.tsx', 'utf8');
const nextConfig = readFileSync('next.config.ts', 'utf8') + readFileSync('src/lib/csp.ts', 'utf8');
const approvedGaId = 'G-EMG4X46V0S';
const approvedGtmId = 'GTM-WM4SD7HP';
const verificationFiles = [
  'public/google3526c15e10fa1913.html',
  'public/google6f7827292f8e19bc.html',
];

for (const file of verificationFiles) {
  if (!existsSync(file)) {
    failures.push(`ملف تحقق مفقود: ${file}`);
    continue;
  }
  const content = readFileSync(file, 'utf8').trim();
  if (!content.includes(`google-site-verification: ${file.replace('public/', '')}`)) {
    failures.push(`محتوى ملف التحقق غير مطابق لاسم الملف: ${file}`);
  }
}

const expectedTokens = [
  'wq9nowZwnBPIzL-Er-1I1Va4CMv-RQ4QqtEsIbdO8fs',
  'Of0DQJPyryp-UqLB2Xdr5bDSkQbm_rU7bjbL6l8uGCs',
];
for (const token of expectedTokens) {
  if (!layout.includes(token)) failures.push(`رمز تحقق غير موجود في src/app/layout.tsx: ${token}`);
}

if (
  layout.includes('name="google-adsense-account"') ||
  layout.includes('google-consent-mode-default') ||
  layout.includes('window.adsbygoogle') ||
  layout.includes('requestNonPersonalizedAds = 1')
) {
  failures.push('يجب ألا يحتوي HTML الخاص بتطبيق Capacitor على بيانات ناشر AdSense أو Consent Mode globals.');
}

if (layout.includes('NEXT_PUBLIC_GA_MEASUREMENT_ID') || layout.includes(approvedGaId) || layout.includes('googletagmanager.com/gtag/js')) {
  failures.push('يجب ألا يُحقن GA4 مباشرة من root layout.');
}
if (!webAdvertisingRuntime.includes('NEXT_PUBLIC_GTM_ID')) failures.push('متغير GTM canonical غير موجود في web-only runtime.');
if (!webAdvertisingRuntime.includes(approvedGtmId)) failures.push(`معرّف GTM المعتمد غير موجود: ${approvedGtmId}`);
if (!webAdvertisingRuntime.includes('https://www.googletagmanager.com/gtm.js?id=')) failures.push('مصدر GTM غير موجود في web-only runtime.');
if (webAdvertisingRuntime.includes('googletagmanager.com/gtag/js')) failures.push('يجب تحميل GA4 من داخل GTM فقط لتجنب تكرار Page View.');
if (!webAdvertisingRuntime.includes("analytics_storage: 'denied'")) failures.push('يجب أن يبقى Consent Mode في حالة رفض افتراضية حتى يحصل النظام على اختيار موافقة صالح.');

if (!layout.includes('import { WebAdvertisingRuntime } from "@/components/layout/web-advertising-runtime";')) failures.push('استيراد WebAdvertisingRuntime غير موجود في root layout.');
if (!layout.includes('<WebAdvertisingRuntime />')) failures.push('WebAdvertisingRuntime غير مركّب في root layout.');
const nativeGuardIndex = webAdvertisingRuntime.indexOf('if (Capacitor.isNativePlatform())');
const canonicalOriginGuardIndex = webAdvertisingRuntime.indexOf('if (!isCanonicalProductionOrigin())');
const consentDefaultsIndex = webAdvertisingRuntime.indexOf('installConsentModeDefaults();');
const gtmInjectionIndex = webAdvertisingRuntime.indexOf('"google-tag-manager"');
const fundingChoicesInjectionIndex = webAdvertisingRuntime.indexOf('"google-funding-choices"');
if (
  nativeGuardIndex < 0 ||
  canonicalOriginGuardIndex < 0 ||
  gtmInjectionIndex < 0 ||
  fundingChoicesInjectionIndex < 0 ||
  nativeGuardIndex > gtmInjectionIndex ||
  nativeGuardIndex > fundingChoicesInjectionIndex ||
  consentDefaultsIndex < 0 ||
  nativeGuardIndex > consentDefaultsIndex ||
  canonicalOriginGuardIndex > consentDefaultsIndex ||
  consentDefaultsIndex > gtmInjectionIndex ||
  consentDefaultsIndex > fundingChoicesInjectionIndex
) {
  failures.push('يجب أن يسبق خروج Capacitor وفحص الأصل canonical كل حقن فعلي لإعلانات الويب وGTM وFunding Choices.');
}
if (/import\(.+analytics/.test(deferredAnalytics)) failures.push('تمت إعادة تحميل Analytics ديناميكيًا خارج root layout.');
const frameSrc = nextConfig.match(/frame-src\s+([^;]+)/)?.[1] ?? '';
if (!frameSrc.split(/\s+/).includes('https://www.googletagmanager.com')) failures.push('أصل GTM مفقود من CSP frame-src؛ قد يُحجب إطار noscript.');

if (failures.length) {
  console.error('GOOGLE_SEARCH_CONSOLE_VERIFICATION_FAILED');
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}

console.log('GOOGLE_SEARCH_CONSOLE_VERIFICATION_PASSED');
console.log(`تم التحقق من ${verificationFiles.length} ملف HTML ورمزي meta.`);
