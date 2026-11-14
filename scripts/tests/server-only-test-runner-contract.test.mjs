import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const cursorService = readFileSync(
  "src/features/social/services/social-insights-scan-cursor.ts",
  "utf8",
);
assert.doesNotMatch(
  cursorService,
  /^import\s+["']server-only["'];/m,
  "the shared social insights cursor is imported by Node background workers and must remain Node-safe",
);

const workerUrl = pathToFileURL(resolve("scripts/jobs/social-publishing.ts")).href;
const workerImport = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    `await import(${JSON.stringify(workerUrl)})`,
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.equal(
  workerImport.status,
  0,
  [
    workerImport.stdout,
    workerImport.stderr,
  ].filter(Boolean).join("\n") || "the social background worker must load under default Node conditions",
);

console.log("Social insights worker import boundary contract passed.");
