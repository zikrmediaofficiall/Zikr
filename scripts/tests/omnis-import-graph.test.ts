import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOmnisImportGraph,
  getTransitiveOmnisImporters,
  isOmnisImportGraph,
} from "@/features/admin/omnis/import-graph";

const SHA = "cccccccccccccccccccccccccccccccccccccccc";

test("import graph resolves TypeScript aliases and relative imports", () => {
  const graph = buildOmnisImportGraph({
    files: [
      "src/features/admin/omnis/contracts.ts",
      "src/features/admin/omnis/commands.ts",
      "src/app/admin/omnis/page.tsx",
      "src/features/admin/omnis/index.ts",
      "src/features/admin/omnis/external.ts",
    ],
    specifiersByFile: {
      "src/features/admin/omnis/contracts.ts": [],
      "src/features/admin/omnis/commands.ts": ["./contracts"],
      "src/app/admin/omnis/page.tsx": ["@/features/admin/omnis/commands"],
      "src/features/admin/omnis/index.ts": ["./contracts.js"],
      "src/features/admin/omnis/external.ts": ["react"],
    },
    commitSha: SHA,
  });

  assert.equal(graph.complete, true);
  assert.equal(graph.commitSha, SHA);
  assert.equal(graph.edgeCount, 3);
  assert.deepEqual(graph.imports["src/features/admin/omnis/commands.ts"], [
    "src/features/admin/omnis/contracts.ts",
  ]);
  assert.deepEqual(graph.imports["src/features/admin/omnis/index.ts"], [
    "src/features/admin/omnis/contracts.ts",
  ]);
  assert.deepEqual(graph.imports["src/features/admin/omnis/external.ts"], []);
});

test("reverse import traversal returns transitive importers without cycles or duplicates", () => {
  const graph = buildOmnisImportGraph({
    files: [
      "src/features/admin/omnis/contracts.ts",
      "src/features/admin/omnis/commands.ts",
      "src/app/admin/omnis/page.tsx",
      "scripts/tests/omnis-admin.test.ts",
    ],
    specifiersByFile: {
      "src/features/admin/omnis/contracts.ts": ["./commands"],
      "src/features/admin/omnis/commands.ts": ["./contracts"],
      "src/app/admin/omnis/page.tsx": ["@/features/admin/omnis/commands"],
      "scripts/tests/omnis-admin.test.ts": ["../../src/app/admin/omnis/page"],
    },
  });

  assert.deepEqual(
    getTransitiveOmnisImporters(graph, "src/features/admin/omnis/contracts.ts"),
    [
      "scripts/tests/omnis-admin.test.ts",
      "src/app/admin/omnis/page.tsx",
      "src/features/admin/omnis/commands.ts",
    ],
  );
  assert.deepEqual(getTransitiveOmnisImporters(graph, "../outside.ts"), []);
});

test("graph validation rejects incomplete or malformed graph payloads", () => {
  const graph = buildOmnisImportGraph({
    files: ["src/features/admin/omnis/contracts.ts"],
    specifiersByFile: { "src/features/admin/omnis/contracts.ts": [] },
    generatedAt: "2026-11-25T00:00:00.000Z",
    commitSha: SHA,
  });

  assert.equal(isOmnisImportGraph(graph), true);
  assert.equal(isOmnisImportGraph({ ...graph, complete: false }), false);
  assert.equal(isOmnisImportGraph({ ...graph, edgeCount: -1 }), false);
  assert.equal(isOmnisImportGraph({ ...graph, imports: [] }), false);
});

test("path normalization drops traversal and malformed file paths", () => {
  const graph = buildOmnisImportGraph({
    files: [
      "../secret.ts",
      "/absolute.ts",
      "src/features/admin/omnis/contracts.ts",
      "src//bad.ts",
    ],
    specifiersByFile: {},
  });

  assert.deepEqual(graph.files, ["src/features/admin/omnis/contracts.ts"]);
  assert.equal(graph.edgeCount, 0);
});
