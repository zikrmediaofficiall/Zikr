import assert from "node:assert/strict";
import { abacAllows, currentEnvironment, parseAbacPolicy } from "../../src/features/admin/services/abac-policy";

assert.deepEqual(parseAbacPolicy(undefined), []);
assert.deepEqual(parseAbacPolicy("{bad"), []);
assert.deepEqual(parseAbacPolicy('{"a":1}'), []);
const rules = parseAbacPolicy('[{"permission":"system.manage","environments":["production"],"roles":["super_admin"]},{"permission":"content.delete","scopes":["kids"],"roles":[]},{"nope":1}]');
assert.equal(rules.length, 2);
const base = { permission: "system.manage", role: "editor", environment: "production" };
assert.equal(abacAllows(base, []), true, "no policy changes nothing");
assert.equal(abacAllows(base, rules), false, "editor blocked in production");
assert.equal(abacAllows({ ...base, role: "super_admin" }, rules), true);
assert.equal(abacAllows({ ...base, environment: "preview" }, rules), true, "rule limited to production");
assert.equal(abacAllows({ permission: "content.delete", role: "super_admin", environment: "production", scope: "kids" }, rules), false, "empty roles denies everyone in scope");
assert.equal(abacAllows({ permission: "content.delete", role: "super_admin", environment: "production" }, rules), true, "scoped rule needs the scope tag");
assert.equal(abacAllows({ permission: "other", role: "editor", environment: "production" }, rules), true);
assert.equal(currentEnvironment({ VERCEL_ENV: "preview", NODE_ENV: "production" }), "preview");
console.log("abac-policy tests passed");
