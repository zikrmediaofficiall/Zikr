import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSeparationOfDutiesEnforced, separationOfDutiesProblem } from "../../src/features/editorial/separation-of-duties";

assert.equal(isSeparationOfDutiesEnforced({}), false, "rule is off by default");
assert.equal(isSeparationOfDutiesEnforced({ EDITORIAL_SOD_ENFORCED: "true" }), true);
assert.equal(separationOfDutiesProblem({ enforced: false, actorId: "a", createdBy: "a" }), null);
assert.ok(separationOfDutiesProblem({ enforced: true, actorId: "a", createdBy: "a" }));
assert.equal(separationOfDutiesProblem({ enforced: true, actorId: "a", createdBy: "b" }), null);
assert.equal(separationOfDutiesProblem({ enforced: true, actorId: "a", createdBy: null }), null);
const actions = readFileSync("src/app/admin/editorial-actions.ts", "utf8");
assert.ok(actions.includes("separationOfDutiesProblem("), "approval must check separation of duties");
const migration = readFileSync("supabase/migrations/20261125170000_content_library_separation_of_duties.sql", "utf8");
assert.ok(/created_by uuid/.test(migration) && /approved_by uuid/.test(migration));
console.log("Editorial separation-of-duties contracts passed.");
