import assert from "node:assert/strict";
import { buildCloudServiceChecks, supabaseHost } from "../../src/features/admin/omnis/cloud-services";

const env = { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: "abcdef1234567", SUPABASE_URL: "https://proj.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "SECRET-SERVICE", NEXT_PUBLIC_SUPABASE_ANON_KEY: "SECRET-ANON", CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "SECRET-CLD", GITHUB_DISPATCH_TOKEN: "SECRET-GH" };
const checks = buildCloudServiceChecks(env);
assert.ok(checks.every((c) => c.ok));
assert.equal(checks[0].detail, "production · abcdef1");
const text = JSON.stringify(checks);
for (const secret of ["SECRET-SERVICE", "SECRET-ANON", "SECRET-CLD", "SECRET-GH"]) assert.ok(!text.includes(secret), "no secret values in output");
const empty = buildCloudServiceChecks({});
assert.ok(empty.every((c) => !c.ok));
assert.equal(supabaseHost("not a url"), null);
console.log("cloud-services tests passed");
