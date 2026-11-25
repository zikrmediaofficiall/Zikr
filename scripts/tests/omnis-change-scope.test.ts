import assert from "node:assert/strict";
import { evaluateOmnisChangeScope } from "../../src/features/admin/omnis/resource-index";
import type { OmnisImportGraph } from "../../src/features/admin/omnis/import-graph";

const scoped = evaluateOmnisChangeScope(["src/features/videos/services/video-cta.ts", "docs/x.md", "package.json", "supabase/migrations/20261125200000_x.sql"]);
assert.equal(scoped.ok, true);
assert.deepEqual(scoped.entries.map((e) => e.scope), ["scoped", "exempt", "exempt", "scoped"]);

const unknown = evaluateOmnisChangeScope(["src/features/videos/services/video-cta.ts", "mystery/area/file.ts", "../escape.ts"]);
assert.equal(unknown.ok, false, "an unknown path blocks the change");
assert.deepEqual(unknown.unscoped, ["mystery/area/file.ts", "../escape.ts"]);

const graph: OmnisImportGraph = {
  version: 1, generatedAt: "2026-11-25T00:00:00.000Z", commitSha: "a".repeat(40), complete: true,
  files: ["src/features/videos/services/a.ts", "src/features/videos/services/b.ts", "scripts/tests/b.test.ts"],
  imports: {}, importedBy: { "src/features/videos/services/b.ts": ["scripts/tests/b.test.ts"], "src/features/videos/services/a.ts": [] }, edgeCount: 1,
};
const withGraph = evaluateOmnisChangeScope(["src/features/videos/services/a.ts", "src/features/videos/services/b.ts"], graph);
assert.deepEqual(withGraph.needsTestReview, ["src/features/videos/services/a.ts"], "a service nothing tests is flagged for review");
assert.equal(withGraph.ok, true, "missing tests do not block");
assert.deepEqual(withGraph.entries[1].relatedTests, ["scripts/tests/b.test.ts"]);
console.log("OMNIS change scope contracts passed.");
