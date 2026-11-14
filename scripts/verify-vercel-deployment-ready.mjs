import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_INTERVAL_MS = 5_000;

export async function waitForVercelDeploymentReady({
  deploymentUrl,
  token,
  teamId,
  fetchImpl = fetch,
  sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)),
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  logger = console,
}) {
  if (!deploymentUrl || !token || !teamId) {
    throw new Error("DEPLOYMENT_URL, VERCEL_TOKEN, and VERCEL_ORG_ID are required.");
  }

  let parsedDeploymentUrl;
  try {
    parsedDeploymentUrl = new URL(deploymentUrl);
  } catch {
    throw new Error("DEPLOYMENT_URL must be an absolute HTTPS URL.");
  }
  if (parsedDeploymentUrl.protocol !== "https:" || !parsedDeploymentUrl.hostname.endsWith(".vercel.app")) {
    throw new Error("DEPLOYMENT_URL must point to the exact Vercel deployment hostname.");
  }

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
      logger.log?.("PASS: Vercel deployment reached READY.");
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
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
