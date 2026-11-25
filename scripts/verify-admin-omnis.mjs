import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const centers = read("src/features/admin/omnis/registry.ts");
const plan = read("src/features/admin/omnis/plan.ts");
const ledger = JSON.parse(read("docs/OMNIS_EXECUTION_LEDGER.json"));
const migration = read("supabase/migrations/20261125045720_zikr_omnis_execution_ledger.sql");
const navigation = read("src/features/admin/config/navigation.ts");
const page = read("src/app/admin/omnis/page.tsx");
const actions = read("src/app/admin/omnis/actions.ts");
const moduleDependencies = read("src/features/admin/omnis/module-dependencies.ts");
const moduleStatusService = read("src/features/admin/services/omnis-module-status.ts");
const incidents = read("src/features/admin/omnis/incidents.ts");
const commands = read("src/features/admin/omnis/commands.ts");
const resourceIndex = read("src/features/admin/omnis/resource-index.ts");
const resourceService = read("src/features/admin/services/omnis-project-index.ts");
const explorerPage = read("src/app/admin/omnis/project/page.tsx");

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
if (!moduleDependencies.includes('moduleId: "global-command", dependencyIds: ["supabase-database", "github-status", "github-workflows", "video-generation-queue", "vercel-deployment"]')) {
  failures.push("Global command center must include database, GitHub, video queue and Vercel dependencies");
}
if (!moduleStatusService.includes('dependencyId: "vercel-deployment"') || !moduleStatusService.includes('/vercel/i.test(item.context)')) {
  failures.push("Global command center must derive Vercel state from Vercel-labelled GitHub commit status contexts");
}
if (!moduleStatusService.includes('health.queues.videoRetryWait > 0') || !moduleStatusService.includes('health.queues.videoPending') || !moduleStatusService.includes('health.queues.videoProcessing') || !moduleStatusService.includes('health.queues.videoFailed')) {
  failures.push("Global command center must report all exact video queue states and surface retry/failure attention");
}
if (!page.includes('globalOperationalDependencies.map') || !page.includes('dependency.freshness') || !page.includes('dependency.source') || !page.includes('moduleStatusSnapshot.error')) {
  failures.push("OMNIS command center must show source-backed operational cards, freshness and probe errors");
}
if (!incidents.includes("buildOmnisIncidents") || !incidents.includes("affectedModules") || !incidents.includes("owner")) {
  failures.push("OMNIS incident view must aggregate affected modules and define an accountable owner");
}
if (!commands.includes('key: "refresh-operational-status"') || !commands.includes("mutates: false") || !commands.includes("resolveOmnisSafeCommand")) {
  failures.push("OMNIS safe commands must be explicitly allow-listed and read-only by default");
}
if (!actions.includes("resolveOmnisSafeCommand") || !actions.includes("admin.omnis.safe_command.inspect") || !actions.includes('requireAdminPermission("system.manage")')) {
  failures.push("OMNIS operational refresh command must check permission and append an audit event");
}
if (!page.includes("moduleStatusSnapshot.incidents.slice(0, 12).map") || !page.includes("runOmnisSafeCommandAction") || !page.includes("ليست سجل حوادث دائمًا")) {
  failures.push("OMNIS command center must display live incidents and disclose their non-persisted lifecycle");
}
if (!resourceIndex.includes("classifyOmnisResource") || !resourceIndex.includes("analyzeOmnisResourceImpact") || !resourceIndex.includes("OMNIS_MODULE_DEPENDENCIES")) {
  failures.push("Project Explorer must classify resources and expand a registered dependency impact graph");
}
if (!resourceService.includes('import "server-only"') || !resourceService.includes("/git/trees/") || !resourceService.includes("GITHUB_DISPATCH_TOKEN")) {
  failures.push("Project Explorer index must read the current GitHub tree server-side without exposing credentials");
}
if (!explorerPage.includes('requireAdminPermission("system.manage")') || !explorerPage.includes("OMNIS_MODULE_DEPENDENCIES.map") || !explorerPage.includes("analyzeOmnisResourceImpact")) {
  failures.push("Project Explorer page must require admin permission and show the index, dependency map and impact analysis");
}
if (!centers.includes('id: "project-explorer"') || !centers.includes('path: "/admin/omnis/project"')) {
  failures.push("Project Explorer must be reachable from the registered OMNIS center");
}

if (failures.length) {
  console.error("OMNIS verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("OMNIS verification passed: 30 centers, 15 phases, 45 unique tasks, RLS, audited transitions and source-backed global operations status.");
