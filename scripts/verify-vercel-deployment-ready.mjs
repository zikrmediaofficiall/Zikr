import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_INTERVAL_MS = 5_000;

export async function waitForVercelDeploymentReady({
  deploymentUrl,
  token,
  teamId,
  expectedSha,
  expectedProjectId,
  expectedAliasUrl,
  fetchImpl = fetch,
  sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)),
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  logger = console,
}) {
  if (!deploymentUrl || !token || !teamId || !expectedSha || !expectedProjectId || !expectedAliasUrl) {
    throw new Error("DEPLOYMENT_URL, VERCEL_TOKEN, VERCEL_ORG_ID, EXPECTED_COMMIT_SHA, EXPECTED_VERCEL_PROJECT_ID, and EXPECTED_VERCEL_ALIAS_URL are required.");
  }
  if (!/^[a-f0-9]{40}$/i.test(expectedSha)) {
    throw new Error("EXPECTED_COMMIT_SHA must be a full 40-character Git SHA.");
  }

  let parsedDeploymentUrl;
  try {
    parsedDeploymentUrl = new URL(deploymentUrl);
  } catch {
    throw new Error("DEPLOYMENT_URL must be an absolute HTTPS URL.");
  }
  if (parsedDeploymentUrl.protocol !== "https:" || !parsedDeploymentUrl.hostname.endsWith(".vercel.app")) {
    throw new Error("DEPLOYMENT_URL must point to a Vercel-hosted deployment URL.");
  }

  let parsedExpectedAliasUrl;
  try {
    parsedExpectedAliasUrl = new URL(expectedAliasUrl);
  } catch {
    throw new Error("EXPECTED_VERCEL_ALIAS_URL must be an absolute HTTPS origin.");
  }
  if (
    parsedExpectedAliasUrl.protocol !== "https:" ||
    parsedExpectedAliasUrl.pathname !== "/" ||
    parsedExpectedAliasUrl.search ||
    parsedExpectedAliasUrl.hash
  ) {
    throw new Error("EXPECTED_VERCEL_ALIAS_URL must be an HTTPS origin without a path, query, or fragment.");
  }
  const expectedAliasHost = parsedExpectedAliasUrl.hostname.toLowerCase();

  const apiUrl = new URL(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentUrl)}`,
  );
  apiUrl.searchParams.set("teamId", teamId);

  let lastState = "UNKNOWN";
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Unable to inspect the Vercel deployment after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(intervalMs);
      continue;
    }

    if (response.status === 404 || response.status === 409 || response.status >= 500) {
      lastState = `HTTP_${response.status}`;
      if (attempt < maxAttempts) {
        await sleep(intervalMs);
        continue;
      }
      break;
    }
    if (!response.ok) {
      throw new Error(`Vercel deployment inspection failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    const state = String(
      payload.readyState ?? payload.state ?? payload.status ?? "",
    ).toUpperCase();
    lastState = state || "UNKNOWN";
    if (state === "READY") {
      if (String(payload.target ?? "").toLowerCase() !== "production") {
        throw new Error("Vercel deployment reached READY but its target is not production.");
      }
      const actualProjectId = payload.projectId ?? payload.project?.id ?? "";
      if (actualProjectId !== expectedProjectId) {
        throw new Error("Vercel deployment project ID does not match the approved project.");
      }
      const actualSha = String(
        payload.gitSource?.sha ??
        payload.meta?.githubCommitSha ??
        payload.meta?.githubCommitSha1 ??
        payload.meta?.gitCommitSha ??
        "",
      ).toLowerCase();
      const expected = expectedSha.toLowerCase();
      // Release verification is pinned to the full approved commit SHA.
      // A seven-character prefix is useful for display, but is not sufficient
      // evidence that the deployment was built from the exact release commit.
      const shaMatches =
        /^[a-f0-9]{40}$/i.test(actualSha) &&
        actualSha.toLowerCase() === expected;
      if (!shaMatches) {
        throw new Error("Vercel deployment commit SHA does not match the approved Git SHA.");
      }
      const aliases = Array.isArray(payload.alias) ? payload.alias : [];
      const hasExpectedAlias = aliases.some((alias) => {
        const value = String(alias ?? "").trim();
        if (!value) return false;
        try {
          const parsed = new URL(value.includes("://") ? value : `https://${value}`);
          return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === expectedAliasHost;
        } catch {
          return false;
        }
      });
      if (!hasExpectedAlias) {
        lastState = "READY_WAITING_FOR_PRODUCTION_ALIAS";
        if (attempt < maxAttempts) {
          await sleep(intervalMs);
          continue;
        }
        throw new Error(`Vercel deployment reached READY but did not receive the expected production alias ${expectedAliasHost}.`);
      }
      logger.log?.("PASS: Vercel deployment reached READY for the approved project, commit, and production alias.");
      return payload;
    }
    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(`Vercel deployment ended in terminal state ${state}.`);
    }
    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  throw new Error(
    `Vercel deployment did not reach READY after ${maxAttempts} checks (last state: ${lastState}).`,
  );
}

async function main() {
  await waitForVercelDeploymentReady({
    deploymentUrl: process.env.DEPLOYMENT_URL,
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_ORG_ID,
    expectedSha: process.env.EXPECTED_COMMIT_SHA,
    expectedProjectId: process.env.EXPECTED_VERCEL_PROJECT_ID,
    expectedAliasUrl: process.env.EXPECTED_VERCEL_ALIAS_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
