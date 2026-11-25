import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceVerificationProblem } from "../../src/features/editorial/source-verification";

const ok = { url: "https://example.org/book", license: "CC-BY", attribution: null, authority_level: 3 };
assert.equal(sourceVerificationProblem(ok), null);
assert.ok(sourceVerificationProblem(null));
assert.ok(sourceVerificationProblem({ ...ok, url: null }), "needs a url");
assert.ok(sourceVerificationProblem({ ...ok, url: "http://example.org" }), "http is not enough");
assert.ok(sourceVerificationProblem({ ...ok, url: "not a url" }));
assert.ok(sourceVerificationProblem({ ...ok, license: " ", attribution: "" }), "needs license or attribution");
assert.equal(sourceVerificationProblem({ ...ok, license: null, attribution: "Dar X" }), null);
assert.ok(sourceVerificationProblem({ ...ok, authority_level: 0 }));
const actions = readFileSync("src/app/admin/sources/actions.ts", "utf8");
assert.ok(actions.includes('requireAdminStepUp("sources.manage"'), "step-up required");
assert.ok(actions.includes("sourceVerificationProblem(source)"));
assert.ok(actions.includes("runPostCommitAudit("));
console.log("Source verification contracts passed.");
