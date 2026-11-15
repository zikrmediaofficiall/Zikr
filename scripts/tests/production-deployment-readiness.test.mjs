import assert from "node:assert/strict";
import test from "node:test";
import { waitForVercelDeploymentReady } from "../verify-vercel-deployment-ready.mjs";
import { verifySupabaseEdgeHealth } from "../verify-supabase-edge-health.mjs";

const expectedAliasUrl = "https://zikrmediaofficial.vercel.app";
const expectedAlias = ["zikrmediaofficial.vercel.app"];
const productionIdentity = {
  target: "production",
  alias: expectedAlias,
};

test("Vercel deployment readiness waits for READY and uses the exact deployment URL", async () => {
  let calls = 0;
  const waits = [];
  let requestUrl;
  const payload = await waitForVercelDeploymentReady({
    deploymentUrl: "https://zikr-audit-abc123.vercel.app",
    token: "test-token",
    teamId: "team_test",
    expectedSha: "a".repeat(40),
    expectedProjectId: "prj_test",
    expectedAliasUrl,
    maxAttempts: 3,
    intervalMs: 25,
    sleep: async (milliseconds) => waits.push(milliseconds),
    logger: { log() {} },
    fetchImpl: async (url, init) => {
      calls += 1;
      requestUrl = new URL(url);
      assert.equal(init.method, "GET");
      assert.equal(init.headers.Authorization, "Bearer test-token");
      return new Response(JSON.stringify({
        readyState: calls === 1 ? "BUILDING" : "READY",
        ...productionIdentity,
        projectId: "prj_test",
        gitSource: { sha: "a".repeat(40) },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  assert.equal(payload.readyState, "READY");
  assert.equal(calls, 2);
  assert.deepEqual(waits, [25]);
  assert.equal(requestUrl.pathname, "/v13/deployments/https%3A%2F%2Fzikr-audit-abc123.vercel.app");
  assert.equal(requestUrl.searchParams.get("teamId"), "team_test");
});

test("Vercel readiness rejects terminal deployment failures and non-deployment URLs", async () => {
  await assert.rejects(
    waitForVercelDeploymentReady({
      deploymentUrl: "https://zikr-audit-abc123.vercel.app",
      token: "test-token",
      teamId: "team_test",
      expectedSha: "a".repeat(40),
      expectedProjectId: "prj_test",
      expectedAliasUrl,
      maxAttempts: 1,
      fetchImpl: async () => new Response(JSON.stringify({ readyState: "ERROR" }), { status: 200 }),
    }),
    /terminal state ERROR/,
  );
  await assert.rejects(
    waitForVercelDeploymentReady({
      deploymentUrl: "https://not-vercel.invalid",
      token: "test-token",
      teamId: "team_test",
      expectedSha: "a".repeat(40),
      expectedProjectId: "prj_test",
      expectedAliasUrl,
      maxAttempts: 1,
      fetchImpl: async () => new Response(JSON.stringify({ readyState: "READY", ...productionIdentity, projectId: "prj_test", gitSource: { sha: "a".repeat(40) } }), { status: 200 }),
    }),
    /Vercel-hosted deployment URL/,
  );
});

test("Supabase health smoke is a read-only GET and verifies status, CORS, and no-store", async () => {
  const expectedOrigin = expectedAliasUrl;
  let requestUrl;
  let requestInit;
  const payload = await verifySupabaseEdgeHealth({
    supabaseUrl: "https://zqtssvlvmkzeeyqghqfk.supabase.co",
    expectedOrigin,
    fetchImpl: async (url, init) => {
      requestUrl = new URL(url);
      requestInit = init;
      return new Response(JSON.stringify({
        status: "ok",
        service: "zikr-edge-functions",
        version: "1.1.0",
        timestamp: "2026-11-14T17:00:00.000Z",
        region: "us-east-1",
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": expectedOrigin,
          "cache-control": "no-store",
        },
      });
    },
  });

  assert.equal(payload.status, "ok");
  assert.equal(requestInit.method, "GET");
  assert.equal(requestInit.headers.Origin, expectedOrigin);
  assert.equal(requestUrl.href, "https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/health");
});

test("Supabase health smoke fails closed on bad health, CORS, or cache headers", async () => {
  const base = {
    supabaseUrl: "https://zqtssvlvmkzeeyqghqfk.supabase.co",
    expectedOrigin: expectedAliasUrl,
  };
  await assert.rejects(
    verifySupabaseEdgeHealth({
      ...base,
      fetchImpl: async () => new Response(JSON.stringify({ status: "degraded", service: "zikr-edge-functions", version: "1" }), {
        status: 200,
        headers: { "access-control-allow-origin": base.expectedOrigin, "cache-control": "no-store" },
      }),
    }),
    /unexpected health contract/,
  );
  await assert.rejects(
    verifySupabaseEdgeHealth({
      ...base,
      fetchImpl: async () => new Response(JSON.stringify({ status: "ok", service: "zikr-edge-functions", version: "1" }), {
        status: 200,
        headers: { "access-control-allow-origin": "https://other.example", "cache-control": "no-store" },
      }),
    }),
    /canonical production origin/,
  );
  await assert.rejects(
    verifySupabaseEdgeHealth({
      ...base,
      fetchImpl: async () => new Response(JSON.stringify({ status: "ok", service: "zikr-edge-functions", version: "1" }), {
        status: 200,
        headers: { "access-control-allow-origin": base.expectedOrigin, "cache-control": "public, max-age=60" },
      }),
    }),
    /non-cacheable/,
  );
});

test("Vercel readiness rejects a deployment for the wrong project or commit", async () => {
  const base = {
    deploymentUrl: "https://zikr-audit-abc123.vercel.app",
    token: "test-token",
    teamId: "team_test",
    expectedSha: "a".repeat(40),
    expectedProjectId: "prj_test",
    expectedAliasUrl,
    maxAttempts: 1,
  };
  await assert.rejects(
    waitForVercelDeploymentReady({
      ...base,
      fetchImpl: async () => new Response(JSON.stringify({
        readyState: "READY",
        ...productionIdentity,
        projectId: "prj_other",
        gitSource: { sha: "a".repeat(40) },
      }), { status: 200 }),
    }),
    /project ID does not match/,
  );
  await assert.rejects(
    waitForVercelDeploymentReady({
      ...base,
      fetchImpl: async () => new Response(JSON.stringify({
        readyState: "READY",
        ...productionIdentity,
        projectId: "prj_test",
        gitSource: { sha: "b".repeat(40) },
      }), { status: 200 }),
    }),
    /commit SHA does not match/,
  );
});

test("Vercel readiness rejects abbreviated and overlong commit SHAs", async () => {
  const base = {
    deploymentUrl: "https://zikr-audit-abc123.vercel.app",
    token: "test-token",
    teamId: "team_test",
    expectedSha: "a".repeat(40),
    expectedProjectId: "prj_test",
    expectedAliasUrl,
    maxAttempts: 1,
  };

  for (const actualSha of ["a".repeat(7), "a".repeat(40) + "b"]) {
    await assert.rejects(
      waitForVercelDeploymentReady({
        ...base,
        fetchImpl: async () => new Response(JSON.stringify({
          readyState: "READY",
          ...productionIdentity,
          projectId: "prj_test",
          gitSource: { sha: actualSha },
        }), { status: 200 }),
      }),
      /commit SHA does not match/,
      "only the exact full deployment commit SHA may pass release readiness",
    );
  }
});
