#!/usr/bin/env node

import { getIosAssociatedDomainAppIdStatus } from "./lib/ios-associated-domain-contract.mjs";

const result = getIosAssociatedDomainAppIdStatus({
  appId: process.env.IOS_ASSOCIATED_DOMAIN_APP_ID,
  vercelEnv: process.env.VERCEL_ENV,
});

const icon = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
console.log(icon + " IOS_ASSOCIATED_DOMAIN_APP_ID: " + result.detail);
if (result.status === "fail") process.exit(1);
