import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: { test: string };
};
const scanCursorService = readFileSync(
  "src/features/social/services/social-insights-scan-cursor.ts",
  "utf8",
);
const testCommand = packageJson.scripts.test;

assert.match(
  scanCursorService,
  /^import\s+["']server-only["'];/m,
  "the social insights cursor must retain its server-only boundary",
);
assert.match(
  testCommand,
  /node --conditions=react-server --import tsx scripts\/tests\/social-post-insights-storage\.test\.ts/,
  "the Node test runner must select the React Server export for server-only modules",
);
assert.doesNotMatch(
  testCommand,
  /tsx scripts\/tests\/social-post-insights-storage\.test\.ts/,
  "the social insights test must not run through the default client condition",
);

console.log("Server-only test runner contract passed.");
