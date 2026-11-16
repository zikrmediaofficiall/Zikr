import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isLocalDevelopmentOAuthHost } from "../../src/lib/auth/oauth-origin";

for (const host of ["localhost", "LOCALHOST", "127.0.0.1", "::1", "[::1]"]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), true, host + " must preserve its local OAuth origin");
}

for (const host of ["zikrmediaofficial.vercel.app", "localhost.evil.example", "localhost]", "[localhost", "127.0.0.2", ""]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), false, host + " must not bypass canonical OAuth origin enforcement");
}

console.log("Local OAuth origin contract passed.");

const authSource = readFileSync("src/lib/auth-enhanced.ts", "utf8");
assert.ok(
  authSource.includes("isLocalDevelopmentOAuthHost(host)"),
  "server-side canonical OAuth origin resolution must share the bracket-aware local-host allowlist",
);
assert.ok(
  !authSource.includes('host === "::1"'),
  "server-side canonical OAuth origin resolution must not compare IPv6 hostnames without brackets",
);
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");
assert.ok(supabaseConfig.includes('"http://127.0.0.1:3000/**"'));
assert.ok(supabaseConfig.includes('"http://[::1]:3000/**"'));
console.log("Canonical loopback OAuth origin and Supabase allowlist contracts passed.");
