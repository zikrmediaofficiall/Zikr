#!/usr/bin/env node

import { getIosAssociatedDomainAppIdStatus } from "./lib/ios-associated-domain-contract.mjs";

// A normal Vercel web build must not be blocked by an Apple-only setting.
// The dedicated iOS store-release readiness gate remains fail-closed.
const result = getIosAssociatedDomainAppIdStatus({
  appId: process.env.IOS_ASSOCIATED_DOMAIN_APP_ID,
  vercelEnv: process.env.VERCEL_ENV,
  required: false,
});

const icon = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
console.log(icon + " IOS_ASSOCIATED_DOMAIN_APP_ID: " + result.detail);
if (result.status === "fail") process.exit(1);
