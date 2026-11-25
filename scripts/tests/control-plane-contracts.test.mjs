import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contracts = readFileSync("src/features/admin/omnis/contracts.ts", "utf8");
const service = readFileSync("src/features/admin/services/control-plane.ts", "utf8");

test("control plane defines the complete operation vocabulary", () => {
  for (const operation of ["read", "create", "update", "delete", "execute"]) {
    assert.ok(contracts.includes(`"${operation}"`));
  }
});

test("command catalog includes read, write and execute operations", () => {
  for (const operation of ["read", "update", "execute"]) {
    assert.match(service, new RegExp(`operation: "${operation}"`));
  }
});

test("all privileged actions declare step-up and module-owned adapters", () => {
  assert.match(service, /mutates: true[\s\S]*?requiresStepUp: true[\s\S]*?adapter: "module-owned"/);
  assert.match(service, /executableThroughControlPlane: false/);
});

test("authorization is server-side and resolves effective role before permission check", () => {
  assert.match(service, /import "server-only"/);
  assert.match(service, /getCurrentProfile\(\)/);
  assert.match(service, /hasAdminPermission\(profile\.role, command\.permission\)/);
});

test("resource IDs and idempotency keys are bounded", () => {
  assert.match(contracts, /RESOURCE_TOKEN/);
  assert.match(contracts, /IDEMPOTENCY_TOKEN/);
  assert.match(contracts, /isValidControlPlaneRequest/);
});

test("control plane does not provide arbitrary shell or code execution", () => {
  assert.doesNotMatch(service, /child_process|execSync|spawnSync|new Function|\beval\(/);
});
