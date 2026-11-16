import assert from "node:assert/strict";
import { isLocalDevelopmentOAuthHost } from "../../src/lib/auth/oauth-origin";

for (const host of ["localhost", "LOCALHOST", "127.0.0.1", "::1", "[::1]"]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), true, host + " must preserve its local OAuth origin");
}

for (const host of ["zikrmediaofficial.vercel.app", "localhost.evil.example", "127.0.0.2", ""]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), false, host + " must not bypass canonical OAuth origin enforcement");
}

console.log("Local OAuth origin contract passed.");
