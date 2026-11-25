import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const centers = read("src/features/admin/omnis/registry.ts");
const plan = read("src/features/admin/omnis/plan.ts");
const ledger = JSON.parse(read("docs/OMNIS_EXECUTION_LEDGER.json"));
const migration = read("supabase/migrations/20261125060000_zikr_omnis_execution_ledger.sql");
const navigation = read("src/features/admin/config/navigation.ts");
const page = read("src/app/admin/omnis/page.tsx");
const actions = read("src/app/admin/omnis/actions.ts");

const centerIds = [...centers.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
if (centerIds.length !== 30) failures.push("OMNIS must define exactly 30 control centers");
if (new Set(centerIds).size !== centerIds.length) failures.push("OMNIS center IDs must be unique");

const taskKeys = [...plan.matchAll(/taskKey: "(OMNIS-P\d{2}-\d{2})"/g)].map((m) => m[1]);
if (taskKeys.length !== 45) failures.push("OMNIS execution plan must define exactly 45 stable tasks");
if (new Set(taskKeys).size !== taskKeys.length) failures.push("OMNIS task keys must be unique");
if (ledger.phases.length !== 15) failures.push("execution manifest must contain 15 phases");
const manifestKeys = ledger.phases.flatMap((phase) => phase.tasks.map((task) => task.task_key));
if (manifestKeys.length !== 45 || new Set(manifestKeys).size !== manifestKeys.length) {
  failures.push("execution manifest must contain 45 unique task keys");
}
if (taskKeys.some((key) => !manifestKeys.includes(key)) || manifestKeys.some((key) => !taskKeys.includes(key))) {
  failures.push("TypeScript plan and JSON execution manifest must contain the same stable task keys");
}
if (!migration.includes("ON CONFLICT (task_key) DO NOTHING")) failures.push("migration must seed tasks idempotently");
if (!migration.includes("FOR UPDATE")) failures.push("state transition RPC must lock task rows");
if (!migration.includes("private.has_admin_role")) failures.push("RLS policies must restrict reads to admin roles");
if (!migration.includes("SECURITY INVOKER")) failures.push("transition RPC must not use SECURITY DEFINER");
if (!migration.includes("GRANT EXECUTE ON FUNCTION public.transition_admin_omnis_task") || !migration.includes("TO service_role")) {
  failures.push("transition RPC must be service-role only");
}
if (!migration.includes("valid 40-character commit SHA") || !migration.includes("meaningful test and verification summary")) {
  failures.push("completion must require commit and test evidence");
}
if (!navigation.includes('href: "/admin/omnis"') || !navigation.includes('permission: "system.manage"')) failures.push("OMNIS command center must be in canonical admin navigation with system.manage");
if (!page.includes('requireAdminPermission("system.manage")') || !page.includes("getOmnisExecutionSnapshot") || !page.includes("OMNIS_CENTERS.map")) failures.push("OMNIS page must enforce system.manage and render persisted execution status and the 30-center registry");
if (!actions.includes("requireAdminStepUp") || !actions.includes("transition_admin_omnis_task")) {
  failures.push("state changes must require step-up authorization and the row-locked RPC");
}
if (!actions.includes("recordAdminAuditEvent")) failures.push("state changes must write an admin audit event");

if (failures.length) {
  console.error("OMNIS verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("OMNIS verification passed: 30 centers, 15 phases, 45 unique tasks, idempotent ledger, RLS, audited state transitions.");
