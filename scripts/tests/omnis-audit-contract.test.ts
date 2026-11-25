import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitizeAdminAuditMetadata } from "../../src/features/admin/services/audit-metadata";
import { isValidControlPlaneRequest } from "../../src/features/admin/omnis/contracts";

const request = {
  commandKey: "configuration.update",
  resourceType: "admin_setting",
  resourceId: "homepage.title",
  scope: "resource" as const,
  requestId: "0f8fad5b-d9cb-469f-a165-70867728950e",
};
assert.equal(isValidControlPlaneRequest(request), true);
assert.equal(isValidControlPlaneRequest({ ...request, requestId: "not-a-uuid" }), false);
assert.equal(isValidControlPlaneRequest({ ...request, requestId: "" }), false);

const circular: Record<string, unknown> = { visible: "safe" };
circular.self = circular;

const clean = sanitizeAdminAuditMetadata({
  actorRole: "super_admin",
  safeValue: "preserved",
  apiKey: "do-not-store",
  nested: {
    accessToken: "do-not-store-either",
    refresh_token: "also-secret",
    permission: "system.manage",
  },
  headers: [{ Authorization: "Bearer example", accept: "application/json" }],
  longText: "x".repeat(2_500),
  largeArray: Array.from({ length: 60 }, (_, index) => index),
  circular,
  deep: { one: { two: { three: { four: { five: { six: "too-deep" } } } } } },
  nonFinite: Number.NaN,
});

assert.equal(clean.safeValue, "preserved");
assert.equal(clean.actorRole, "super_admin");
assert.equal(clean.apiKey, undefined, "root API keys must never be retained");
assert.equal((clean.nested as Record<string, unknown>).accessToken, undefined);
assert.equal((clean.nested as Record<string, unknown>).refresh_token, undefined);
assert.equal((clean.nested as Record<string, unknown>).permission, "system.manage");
assert.equal((clean.headers as Array<Record<string, unknown>>)[0].Authorization, undefined);
assert.equal((clean.headers as Array<Record<string, unknown>>)[0].accept, "application/json");
assert.equal((clean.longText as string).length, 2_001);
assert.equal((clean.largeArray as unknown[]).length, 50);
assert.match(String((clean.largeArray as unknown[])[49]), /Truncated 11 additional items/);
assert.equal((clean.circular as Record<string, unknown>).self, "[Circular reference]");
const deepOne = (clean.deep as Record<string, unknown>).one as Record<string, unknown>;
const deepTwo = deepOne.two as Record<string, unknown>;
const deepThree = deepTwo.three as Record<string, unknown>;
assert.equal(deepThree.four, "[Maximum audit metadata depth reached]");
assert.equal(clean.nonFinite, null);

const auditSource = readFileSync("src/features/admin/services/audit.ts", "utf8");
assert.match(auditSource, /sanitizeAdminAuditMetadata/);
assert.match(auditSource, /admin_audit_events/);
const controlPlaneSource = readFileSync("src/features/admin/services/control-plane.ts", "utf8");
assert.match(controlPlaneSource, /recordAdminAuditEvent/);
assert.match(controlPlaneSource, /outcome: "denied"/);
assert.match(controlPlaneSource, /outcome: "success"/);
assert.match(controlPlaneSource, /authorized_not_executed/);
assert.doesNotMatch(controlPlaneSource, /payload:\s*request\.payload/, "raw command payloads must never be written to audit metadata");
assert.match(controlPlaneSource, /targetResourceFingerprint: auditResourceFingerprint/);
assert.doesNotMatch(controlPlaneSource, /targetResourceId:\s*input\.requestedResourceId/, "raw resource identifiers must never be stored in audit metadata");

console.log("OMNIS audit metadata and authorization audit contracts passed.");
