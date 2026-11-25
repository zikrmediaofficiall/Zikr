import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishSourceProblem } from "../../src/features/editorial/publish-gate";

assert.ok(publishSourceProblem(null));
assert.ok(publishSourceProblem({ verified: false, url: "https://x.test" }));
assert.ok(publishSourceProblem({ verified: null, url: null }));
assert.equal(publishSourceProblem({ verified: true, url: null }), null);
const actions = readFileSync("src/app/admin/editorial-actions.ts", "utf8");
assert.ok(actions.includes("publishSourceProblem("), "publish action must check source verification");
assert.ok(actions.includes("/rest/v1/content_sources?select=verified,url"));
console.log("Editorial publish source gate contracts passed.");
