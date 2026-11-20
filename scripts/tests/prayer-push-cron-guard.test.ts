import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guard = readFileSync(
  "supabase/migrations/20261117050000_guard_prayer_push_cron_without_pg_net.sql",
  "utf8",
);
const projectRefReconciliation = readFileSync(
  "supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql",
  "utf8",
);

const pgNetGuardIndex = guard.indexOf("FROM pg_extension WHERE extname = 'pg_net'");
const cronJobReadIndex = guard.indexOf("FROM cron.job");
const unscheduleCapabilityIndex = guard.indexOf(
  "to_regprocedure('cron.unschedule(bigint)')",
);
const unscheduleCallIndex = guard.indexOf("PERFORM cron.unschedule(");

assert.ok(pgNetGuardIndex >= 0, "the migration must inspect pg_net availability");
assert.ok(
  pgNetGuardIndex < unscheduleCapabilityIndex &&
    unscheduleCapabilityIndex < cronJobReadIndex &&
    cronJobReadIndex < unscheduleCallIndex,
  "the migration must check pg_net and unschedule capability before reading the exact cron job, then unschedule only after matching it",
);
assert.ok(unscheduleCallIndex >= 0, "the migration must use the guarded unschedule call");
assert.ok(
  guard.includes("IF to_regprocedure('cron.unschedule(bigint)') IS NULL THEN") &&
    guard.includes("cannot safely disable the ZIKR prayer dispatcher"),
  "the migration must fail rather than leave a dispatcher active when unschedule is unavailable",
);
const cronJobSchemaGuardIndex = guard.indexOf(") <> 3 THEN");
const incompleteSchemaReturnIndex = guard.indexOf("RETURN;", cronJobSchemaGuardIndex);
assert.ok(
  cronJobSchemaGuardIndex >= 0 && incompleteSchemaReturnIndex > cronJobSchemaGuardIndex,
  "the migration must skip the intentionally minimal migration-replay cron.job stub",
);

assert.match(guard, /jobname = 'zikr-prayer-push-dispatch'/,
  "only the named ZIKR prayer dispatcher may be considered");
assert.match(guard, /functions\/v1\/prayer-notification-worker/,
  "the cleanup must also match the exact worker endpoint");
assert.match(guard, /get_push_scheduler_secret/,
  "the cleanup must match the scheduler-authenticated command");
assert.doesNotMatch(guard, /cron\.schedule\(/,
  "the guard must never create a replacement job when pg_net is unavailable");
assert.match(projectRefReconciliation, /cron\.schedule\(/,
  "the existing project-ref reconciliation remains responsible for scheduling when extensions are available");

console.log("Prayer push optional pg_net migration guard contract passed.");
