import assert from "node:assert/strict";
import { waitForVercelDeploymentReady } from "../verify-vercel-deployment-ready.mjs";

const expectedSha = "a".repeat(40);
const base = {
  deploymentUrl: "https://zikr-audit-smoke.vercel.app",
  token: "test-token",
  teamId: "team_test",
  expectedSha,
  expectedProjectId: "prj_expected",
  expectedAliasUrl: "https://zikrmediaofficial.vercel.app",
  maxAttempts: 1,
  sleep: async () => {},
  logger: { log() {} },
};

function fetchPayload(payload) {
  return async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const readyPayload = {
  readyState: "READY",
  target: "production",
  projectId: "prj_expected",
  gitSource: { sha: expectedSha },
  alias: ["zikrmediaofficial.vercel.app"],
};

const ready = await waitForVercelDeploymentReady({
  ...base,
  fetchImpl: fetchPayload(readyPayload),
});
assert.equal(ready.readyState, "READY");

await assert.rejects(
  () => waitForVercelDeploymentReady({ ...base, fetchImpl: fetchPayload({ ...readyPayload, target: "preview" }) }),
  /target is not production/,
);
await assert.rejects(
  () => waitForVercelDeploymentReady({ ...base, fetchImpl: fetchPayload({ ...readyPayload, alias: ["other-project.vercel.app"] }) }),
  /did not receive the expected production alias/,
);
await assert.rejects(
  () => waitForVercelDeploymentReady({ ...base, fetchImpl: fetchPayload({ ...readyPayload, projectId: "prj_other" }) }),
  /project ID does not match/,
);
await assert.rejects(
  () => waitForVercelDeploymentReady({ ...base, fetchImpl: fetchPayload({ ...readyPayload, gitSource: { sha: "b".repeat(40) } }) }),
  /commit SHA does not match/,
);
await assert.rejects(
  () => waitForVercelDeploymentReady({ ...base, expectedAliasUrl: "http://zikrmediaofficial.vercel.app", fetchImpl: fetchPayload(readyPayload) }),
  /absolute HTTPS origin/,
);

console.log("Vercel deployment readiness target, canonical alias, project, and exact SHA contracts passed.");
