import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const smoke = readFileSync("scripts/verify-production-smoke.mjs", "utf8");
const supabaseProductionGate = readFileSync("scripts/verify-supabase-production.mjs", "utf8");
const deploymentReady = readFileSync("scripts/verify-vercel-deployment-ready.mjs", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/release-finalization.yml", "utf8");
const articleService = readFileSync("src/features/articles/services/articles.ts", "utf8");
const articlePage = readFileSync("src/app/articles/[slug]/page.tsx", "utf8");
const duaService = readFileSync("src/features/dua/services/dua.ts", "utf8");
const duaPage = readFileSync("src/app/dua/[slug]/page.tsx", "utf8");
const duaLayout = readFileSync("src/app/dua/[slug]/layout.tsx", "utf8");

const requiredContracts = [
  ["Quran main route must validate the surah catalog", 'expectedContent: /الفاتحة.*الناس/'],
  ["Kids games catalogue must validate a real game entry", 'expectedContent: /مختبر الحروف|Arabic Letter Lab|Letter Lab/i'],
  ["Kids video library must receive a production smoke check", 'path: "/kids/videos"'],
  ["Kids video smoke must validate the rendered child-library heading", '/قصص فيديو مخصصة للأطفال|Stories made for young viewers/i'],
  ["Canonical Quran catalog API must be checked", 'path: "/api/quran/surahs"'],
  ["The API must validate all 114 ordered surahs", "payload.length === 114"],
  ["The final Quran surah must be present", "payload[113]?.id === 114"],
  ["The Arabic loading shell must not count as completed content", "جاري تحميل المحتوى القرآني"],
  ["Rendered body content must be validated separately", "check.expectedContent && !check.expectedContent.test(extractText(body))"],
  ["A short published dua gets a detail-page production smoke check", 'path: "/dua/zikr-dua-expansion-14"'],
  ["Published article detail fallback is covered by production smoke", 'path: "/articles/how-to-read-hadith-carefully"'],
];

for (const [description, token] of requiredContracts) {
  assert.ok(smoke.includes(token), description);
}

const contentFallbackContracts = [
  [articleService, "const arabicSource = mapRow(row, \"ar\")", "English article requests fall back to the published Arabic source"],
  [articleService, "contentLocale: locale", "Article adapters preserve the actual returned content language"],
  [articlePage, "article.contentLocale === \"ar\"", "Article detail explains when Arabic fallback is shown"],
  [duaService, "function resolveDuaLocale", "Dua service resolves a complete available language"],
  [duaService, "contentLocale: \"ar\"", "Dua service records the Arabic fallback language"],
  [duaPage, "const MIN_PUBLIC_DUA_CHARS = 10", "A valid short dua is not rejected by the old 80-character threshold"],
  [duaPage, "dua.contentLocale === \"ar\"", "Dua detail explains when Arabic fallback is shown"],
];
for (const [source, token, description] of contentFallbackContracts) {
  assert.ok(source.includes(token), description);
}
assert.ok(!duaLayout.includes("generateMetadata"), "Dua layout must not issue a duplicate metadata database request");
assert.ok(
  !supabaseProductionGate.includes('method: "POST"'),
  "production Supabase health checks must not mutate rate-limit state",
);
assert.ok(
  supabaseProductionGate.includes('method: "GET"'),
  "production Supabase health checks must use explicit read-only GET requests",
);
assert.ok(
  !supabaseProductionGate.includes("/rest/v1/rpc/consume_admin_rate_limit"),
  "the mutating rate-limit RPC must be tested locally, never invoked by production smoke",
);
assert.ok(
  supabaseProductionGate.includes("/rest/v1/admin_rate_limits?select=actor_id&limit=0"),
  "the production gate may verify the admin rate-limit schema using a read-only GET",
);

assert.ok(deploymentReady.includes("payload.target"), "Vercel readiness must require a production deployment target");
assert.ok(deploymentReady.includes("payload.alias"), "Vercel readiness must require the canonical production alias");
assert.ok(deploymentReady.includes("expectedAliasUrl"), "Vercel readiness must compare the expected canonical alias");
assert.ok(releaseWorkflow.includes("EXPECTED_VERCEL_ALIAS_URL:"), "release workflow must pass the canonical alias into the Vercel readiness gate");
assert.ok(smoke.includes("process.env.DEPLOYMENT_URL?.trim()"), "production smoke must prefer the exact deployment URL over a generic SITE_URL");
assert.ok(smoke.includes("response.url || url"), "production smoke must inspect the final URL after redirects");
assert.ok(smoke.includes("allowedOrigins.has(finalUrl.origin)"), "production smoke must reject redirects outside the verified deployment/canonical origins");

console.log(`Production smoke contract passed: ${requiredContracts.length + contentFallbackContracts.length + 1} assertions.`);
