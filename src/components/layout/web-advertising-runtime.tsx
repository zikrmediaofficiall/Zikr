"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PRODUCTION_URL } from "@/lib/site";

const GOOGLE_TAG_MANAGER_ID =
  process.env.NEXT_PUBLIC_GTM_ID || "GTM-WM4SD7HP";
const GOOGLE_ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-2457467624248791";

function appendScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
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
    "script#google-analytics-config",
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    'iframe[src*="5gvci.com"]',
    'iframe[src*="al5sm.com"]',
    'iframe[src*="googleads.g.doubleclick.net"]',
    'iframe[src*="tpc.googlesyndication.com"]',
    'a[href^="https://uplcm.com/4/12171895"]',
  ];
  document.querySelectorAll(selectors.join(",")).forEach(element => element.remove());
  const windowWithAds = window as Window & { adsbygoogle?: unknown[] };
  delete windowWithAds.adsbygoogle;
}

/**
 * Web-only publisher integrations. GA4 collection is routed through the
 * single GTM container to prevent parallel gtag.js + GTM page_view hits.
 */
export function WebAdvertisingRuntime() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      removeAdvertisingElements();
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      removeAdvertisingElements();
      return;
    }

    if (!isCanonicalProductionOrigin()) {
      removeAdvertisingElements();
      return;
    }

    installConsentModeDefaults();
    let started = false;
    const interactionEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    const startThirdParties = () => {
      if (started) return;
      started = true;
      window.clearTimeout(timeoutId);
      interactionEvents.forEach(name => window.removeEventListener(name, startThirdParties));

      if (!document.querySelector('meta[name="google-adsense-account"]')) {
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
        const dataLayerWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
        dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
        dataLayerWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
        appendScript(
          "google-tag-manager",
          `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_MANAGER_ID}`,
        );
      }
    };

    const timeoutId = window.setTimeout(startThirdParties, 4000);
    interactionEvents.forEach(name =>
      window.addEventListener(name, startThirdParties, { once: true, passive: true }),
    );
    return () => {
      window.clearTimeout(timeoutId);
      interactionEvents.forEach(name => window.removeEventListener(name, startThirdParties));
    };
  }, []);

  return null;
}
