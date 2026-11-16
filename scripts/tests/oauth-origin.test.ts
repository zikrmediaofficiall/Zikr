import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalAuthBaseUrl } from "../../src/lib/auth-enhanced";
import { isLocalDevelopmentOAuthHost } from "../../src/lib/auth/oauth-origin";

for (const host of ["localhost", "LOCALHOST", "127.0.0.1", "::1", "[::1]"]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), true, host + " must preserve its local OAuth origin");
}

for (const host of ["zikrmediaofficial.vercel.app", "localhost.evil.example", "localhost]", "[localhost", "127.0.0.2", ""]) {
  assert.equal(isLocalDevelopmentOAuthHost(host), false, host + " must not bypass canonical OAuth origin enforcement");
}

console.log("Local OAuth origin contract passed.");

const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalNextVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
try {
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
    assert.equal(getCanonicalAuthBaseUrl(origin), origin, origin + " must preserve its local PKCE callback origin");
  }
  process.env.NODE_ENV = "production";
  assert.equal(
    getCanonicalAuthBaseUrl("http://[::1]:3000"),
    "https://zikrmediaofficial.vercel.app",
    "production runtime must still canonicalize loopback OAuth origins",
  );
} finally {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;
  if (originalNextVercelEnv === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV; else process.env.NEXT_PUBLIC_VERCEL_ENV = originalNextVercelEnv;
}
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");
assert.ok(supabaseConfig.includes('"http://127.0.0.1:3000/**"'));
assert.ok(supabaseConfig.includes('"http://[::1]:3000/**"'));
console.log("Canonical loopback OAuth origin and Supabase allowlist contracts passed.");
