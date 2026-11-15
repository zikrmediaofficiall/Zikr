import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const script = "scripts/export-offline-content.mjs";
const envWithoutSupabaseCredentials = { ...process.env };
for (const name of [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLIC_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]) {
  delete envWithoutSupabaseCredentials[name];
}

const optionalRun = spawnSync(process.execPath, [script], {
  encoding: "utf8",
  env: envWithoutSupabaseCredentials,
});
assert.equal(
  optionalRun.status,
  0,
  "an ordinary build without Supabase credentials must preserve the committed snapshot: " +
    (optionalRun.stderr || optionalRun.stdout),
);
assert.match(optionalRun.stderr, /No Supabase credentials; keeping the committed public snapshot unchanged/);
assert.doesNotMatch(optionalRun.stderr, /ReferenceError|Cannot access .* before initialization/);

const requiredRun = spawnSync(process.execPath, [script, "--required"], {
  encoding: "utf8",
  env: envWithoutSupabaseCredentials,
});
assert.notEqual(requiredRun.status, 0, "the required snapshot workflow must reject missing credentials");
assert.match(requiredRun.stderr, /Offline snapshot refresh requires SUPABASE_URL/);
assert.doesNotMatch(requiredRun.stderr, /ReferenceError|Cannot access .* before initialization/);

const missingServiceRoleEnv = {
  ...envWithoutSupabaseCredentials,
  SUPABASE_URL: "https://zqtssvlvmkzeeyqghqfk.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-test-placeholder",
};
const missingServiceRoleRun = spawnSync(process.execPath, [script, "--required"], {
  encoding: "utf8",
  env: missingServiceRoleEnv,
});
assert.notEqual(missingServiceRoleRun.status, 0, "the required snapshot workflow must reject anon-only access");
assert.match(missingServiceRoleRun.stderr, /requires a protected SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(missingServiceRoleRun.stderr, /ReferenceError|Cannot access .* before initialization/);

console.log("Offline snapshot exporter credential bootstrap and no-network guards passed.");
