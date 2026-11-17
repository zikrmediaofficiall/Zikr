import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guard = readFileSync(
  "supabase/migrations/20261117030000_guard_prayer_push_cron_without_pg_net.sql",
  "utf8",
);
const projectRefReconciliation = readFileSync(
  "supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql",
  "utf8",
);

const pgNetGuardIndex = guard.indexOf("FROM pg_extension WHERE extname = 'pg_net'");
const cronJobReadIndex = guard.indexOf("FROM cron.job");
const unscheduleIndex = guard.indexOf("cron.unschedule");
assert.ok(pgNetGuardIndex >= 0, "the migration must inspect pg_net availability");
assert.ok(pgNetGuardIndex < cronJobReadIndex && cronJobReadIndex < unscheduleIndex,
  "the pg_net availability guard must run before reading or changing cron jobs");
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
