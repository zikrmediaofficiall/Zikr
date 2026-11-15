import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadPreviousOfflineSnapshot } from "../lib/offline-previous-snapshot.mjs";

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

const snapshotDirectory = await mkdtemp(path.join(tmpdir(), "zikr-offline-snapshot-"));
const previousManifestPath = path.join(snapshotDirectory, "manifest.json");
const previousKidsPath = path.join(snapshotDirectory, "kids.json");
try {
  assert.deepEqual(
    await loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    { previous: { routes: [], datasets: {} }, previousKidsRows: [] },
    "a genuinely empty first export must be allowed",
  );

  await writeFile(previousKidsPath, "[]", "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /Kids dataset exists without its offline manifest/,
    "an orphaned Kids snapshot must not be mistaken for a first export",
  );

  await rm(previousKidsPath, { force: true });
  await writeFile(previousManifestPath, "{", "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /manifest\.json is invalid JSON/,
    "a corrupt prior manifest must stop export instead of erasing the old route inventory",
  );

  const validPreviousManifest = {
    version: "20261115-20261115160000",
    generatedAt: "2026-11-15T16:00:00.000Z",
    source: "test",
    licenseNote: "test",
    datasets: {
      kids: { path: "/offline-content/v1/kids.json", count: 1 },
    },
    routes: ["/kids/previous-story"],
  };
  await writeFile(previousManifestPath, JSON.stringify(validPreviousManifest), "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /Kids dataset file is missing/,
    "a manifest that references a missing Kids dataset must not silently drop its prior rows",
  );

  await writeFile(previousKidsPath, "{", "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /kids\.json is invalid JSON/,
    "a corrupt prior Kids dataset must stop export",
  );

  await writeFile(previousKidsPath, JSON.stringify({ rows: [] }), "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /Previous Kids dataset must contain a JSON array/,
    "a non-array prior Kids dataset must stop export",
  );

  const previousKidsRows = [{ slug: "previous-story", published: true, is_active: true }];
  await writeFile(previousKidsPath, JSON.stringify(previousKidsRows), "utf8");
  const loaded = await loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath);
  assert.deepEqual(loaded.previous, validPreviousManifest);
  assert.deepEqual(loaded.previousKidsRows, previousKidsRows);

  await writeFile(
    previousManifestPath,
    JSON.stringify({
      ...validPreviousManifest,
      datasets: { kids: { ...validPreviousManifest.datasets.kids, count: 2 } },
    }),
    "utf8",
  );
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /path or count does not match/,
    "a stale manifest count must stop export rather than publish a partial route inventory",
  );

  await writeFile(previousManifestPath, JSON.stringify({ routes: [], datasets: [] }), "utf8");
  await assert.rejects(
    loadPreviousOfflineSnapshot(previousManifestPath, previousKidsPath),
    /string route array and a dataset object/,
    "malformed manifest structure must fail closed",
  );
} finally {
  await rm(snapshotDirectory, { recursive: true, force: true });
}

console.log("Offline snapshot exporter credential and previous-snapshot integrity guards passed.");
