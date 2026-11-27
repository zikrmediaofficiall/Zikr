"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Capacitor } from "@capacitor/core";
import { PRODUCTION_URL } from "@/lib/site";

const GOOGLE_TAG_MANAGER_ID =
  process.env.NEXT_PUBLIC_GTM_ID || "GTM-PVQCFKCB";
const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-W30Z9JW0VF";
const GOOGLE_ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-2457467624248791";

function appendScript(id: string, src: string, options?: { cfasync?: boolean }) {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  if (options?.cfasync === false) script.dataset.cfasync = "false";
  document.head.appendChild(script);
}

function isCanonicalProductionOrigin(): boolean {
  try {
    return window.location.origin === new URL(PRODUCTION_URL).origin;
  } catch {
    return false;
  }
}

function installConsentModeDefaults() {
  if (document.getElementById("google-consent-mode-default")) return;

  const script = document.createElement("script");
  script.id = "google-consent-mode-default";
  script.textContent = `window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.adsbygoogle = window.adsbygoogle || [];
window.adsbygoogle.requestNonPersonalizedAds = 1;
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  personalization_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);`;
  document.head.appendChild(script);
}

function removeAdvertisingElements() {
  const selectors = [
    'meta[name="monetag"]',
    'meta[name="google-adsense-account"]',
    "script#google-consent-mode-default",
    'script[src*="al5sm.com"]',
    'script[src*="5gvci.com"]',
    'script[src*="fundingchoicesmessages.google.com"]',
    'script[src*="googletagmanager.com/gtm.js"]',
    'script[src*="googletagmanager.com/gtag/js"]',
    'script#google-analytics-config',
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    'iframe[src*="5gvci.com"]',
    'iframe[src*="al5sm.com"]',
    'iframe[src*="googleads.g.doubleclick.net"]',
    'iframe[src*="tpc.googlesyndication.com"]',
    'a[href^="https://uplcm.com/4/12171895"]',
  ];

  document.querySelectorAll(selectors.join(",")).forEach(element => {
    element.remove();
  });

  const windowWithAds = window as Window & { adsbygoogle?: unknown[] };
  delete windowWithAds.adsbygoogle;
}

/**
 * Advertising and Google Analytics integrations are website-only. Native
 * Capacitor shells and non-canonical deployment aliases must not load tags.
 */
export function WebAdvertisingRuntime() {
  const [canonicalWebRuntime, setCanonicalWebRuntime] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      removeAdvertisingElements();
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      removeAdvertisingElements();
      return;
    }

    // Vercel Preview deployments are production builds too. Never inject
    // publisher scripts outside the canonical origin.
    if (!isCanonicalProductionOrigin()) {
      removeAdvertisingElements();
      return;
    }

    installConsentModeDefaults();

    // Third-party Google tags (about 330 KiB of JavaScript) are loaded on the
    // first user interaction or after a short delay, whichever comes first, so
    // they no longer compete with the page's own rendering and main thread.
    let started = false;
    const interactionEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    const startThirdParties = () => {
      if (started) return;
      started = true;
      window.clearTimeout(timeoutId);
      interactionEvents.forEach((name) => window.removeEventListener(name, startThirdParties));
      setCanonicalWebRuntime(true);

      const adsenseMeta = document.querySelector(
        'meta[name="google-adsense-account"]',
      );
      if (!adsenseMeta) {
        const meta = document.createElement("meta");
        meta.name = "google-adsense-account";
        meta.content = GOOGLE_ADSENSE_CLIENT;
        document.head.appendChild(meta);
      }

      appendScript(
        "google-funding-choices",
        "https://fundingchoicesmessages.google.com/i/fundingchoicesmessages.js",
      );

      if (/^GTM-[A-Z0-9]+$/i.test(GOOGLE_TAG_MANAGER_ID)) {
        const windowWithDataLayer = window as Window & {
          dataLayer?: Array<Record<string, unknown>>;
        };
        windowWithDataLayer.dataLayer = windowWithDataLayer.dataLayer ?? [];
        windowWithDataLayer.dataLayer.push({
          "gtm.start": Date.now(),
          event: "gtm.js",
        });
        appendScript(
          "google-tag-manager",
          `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_MANAGER_ID}`,
        );
      }
    };
    interactionEvents.forEach((name) => window.addEventListener(name, startThirdParties, { once: true, passive: true }));
    const timeoutId = window.setTimeout(startThirdParties, 4000);
    return () => {
      window.clearTimeout(timeoutId);
      interactionEvents.forEach((name) => window.removeEventListener(name, startThirdParties));
    };
  }, []);

  const validAnalyticsId = /^G-[A-Z0-9]+$/i.test(GOOGLE_ANALYTICS_ID);

  return (
    <>
      {canonicalWebRuntime && validAnalyticsId && (
        <>
          <Script
            id="google-analytics-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            strategy="lazyOnload"
          />
          <Script id="google-analytics-config" strategy="lazyOnload">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: true });`}
          </Script>
        </>
      )}
    </>
  );
}
