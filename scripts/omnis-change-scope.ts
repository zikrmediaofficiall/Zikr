// OMNIS P04-03: list the resources, modules and tests affected by a change set.
// Usage: tsx scripts/omnis-change-scope.ts [base-ref] [--strict]
// Reads `git diff --name-only <base>...HEAD`. With --strict, exits 1 when a changed path has no known owner area.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateOmnisChangeScope } from "../src/features/admin/omnis/resource-index";
import { isOmnisImportGraph } from "../src/features/admin/omnis/import-graph";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const base = args.find((arg) => !arg.startsWith("--")) ?? "origin/main";
const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
  .split("\n").map((line) => line.trim()).filter(Boolean);
let graph = null;
try {
  const parsed: unknown = JSON.parse(readFileSync("src/features/admin/omnis/import-graph.generated.json", "utf8"));
  graph = isOmnisImportGraph(parsed) && parsed.complete ? parsed : null;
} catch { /* area-based fallback */ }

const result = evaluateOmnisChangeScope(changed, graph);
console.log(`Change scope vs ${base}: ${changed.length} file(s), graph ${graph ? "exact" : "area-based (run the build first for exact)"}`);
for (const entry of result.entries) {
  console.log(`- [${entry.scope}] ${entry.path}${entry.affectedModules.length ? "  modules: " + entry.affectedModules.join(",") : ""}`);
}
if (result.needsTestReview.length) console.log("Review test coverage for:\n" + result.needsTestReview.map((p) => "  " + p).join("\n"));
if (!result.ok) {
  console.error("Unscoped paths (no known owner area):\n" + result.unscoped.map((p) => "  " + p).join("\n"));
  if (strict) process.exit(1);
}
