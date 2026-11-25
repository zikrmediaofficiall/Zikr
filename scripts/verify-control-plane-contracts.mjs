import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const contracts = read("src/features/admin/omnis/contracts.ts");
const service = read("src/features/admin/services/control-plane.ts");
const permissions = read("src/features/admin/services/permissions.ts");

for (const operation of ["read", "create", "update", "delete", "execute"]) {
  if (!contracts.includes(`"${operation}"`)) failures.push(`missing control-plane operation: ${operation}`);
}
if (!contracts.includes("ControlPlaneAuthorization")) failures.push("missing typed authorization result");
if (!contracts.includes("isValidControlPlaneRequest")) failures.push("missing request validator");
if (!contracts.includes("RESOURCE_TOKEN")) failures.push("missing bounded resource-token validation");
if (!service.includes('import "server-only"')) failures.push("control-plane service must be server-only");
if (!service.includes("getCurrentProfile()")) failures.push("server authorization must resolve the authenticated actor");
if (!service.includes("hasAdminPermission(profile.role, command.permission)")) failures.push("server authorization must enforce the command permission");
if (!service.includes("CONTROL_PLANE_COMMANDS")) failures.push("missing explicit command allow-list");
if (!service.includes("stepUpRequired: command.requiresStepUp")) failures.push("mutating operations must disclose step-up requirements");
if (!service.includes("executableThroughControlPlane: false")) failures.push("unimplemented commands must not be exposed as executable");
if (/\b(eval|new Function|child_process|execSync|spawnSync)\b/.test(service)) failures.push("control-plane contract must not expose arbitrary code or shell execution");
for (const permission of ["system.manage", "settings.manage", "social.publish", "release.manage"]) {
  if (!permissions.includes(`'${permission}'`)) failures.push(`unregistered permission: ${permission}`);
}

if (failures.length) {
  console.error("CONTROL_PLANE_CONTRACTS_FAILED\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("CONTROL_PLANE_CONTRACTS_PASSED: typed operations, bounded requests, server authorization, command allow-list, step-up metadata, no generic execution.");
