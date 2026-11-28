import assert from "node:assert/strict";
import {
  CUSTOM_DOMAIN_ACTIVE,
  CUSTOM_DOMAIN_URL,
  PRODUCTION_URL,
  PUBLIC_SEO_URL,
  siteConfig,
} from "../../src/lib/site";

assert.equal(CUSTOM_DOMAIN_URL, "https://zikrmediaofficial.qd.je");
assert.equal(PUBLIC_SEO_URL, CUSTOM_DOMAIN_ACTIVE ? CUSTOM_DOMAIN_URL : PRODUCTION_URL);
assert.equal(siteConfig.url, PUBLIC_SEO_URL);
// Auth/OAuth origin must never follow the SEO switch.
assert.equal(PRODUCTION_URL, "https://zikrmediaofficial.vercel.app");
console.log("custom-domain-switch tests passed");
