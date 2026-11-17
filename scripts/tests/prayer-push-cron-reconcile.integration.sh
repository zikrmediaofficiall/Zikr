#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-prayer-push-cron-reconcile-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=zikr_prayer_push_cron_reconcile_test \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d zikr_prayer_push_cron_reconcile_test -c "SELECT 1" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL prayer push cron reconciliation test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -v ON_ERROR_STOP=1 -U postgres -d zikr_prayer_push_cron_reconcile_test)
"${psql[@]}" -f /workspace/scripts/tests/prayer-push-cron-reconcile.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql
"${psql[@]}" -f /workspace/scripts/tests/prayer-push-cron-reconcile.integration.sql

# A comment can contain the expected host and secret references while the
# executable command is unrelated. The migration must still replace it.
"${psql[@]}" <<'SQL'
UPDATE cron.job
SET command = $spoof$
-- net.http_post(
-- url := 'https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/prayer-notification-worker'
-- headers := jsonb_build_object(
-- 'Authorization', 'Bearer ' || public.get_push_scheduler_secret()
-- )
-- body := jsonb_build_object('source', 'pg_cron')
SELECT 1;
$spoof$
WHERE jobname = 'zikr-prayer-push-dispatch';
SQL
"${psql[@]}" -f /workspace/supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql
"${psql[@]}" -f /workspace/scripts/tests/prayer-push-cron-reconcile.integration.sql

# Duplicate job names must be removed and replaced with one canonical job.
"${psql[@]}" -c "INSERT INTO cron.job (jobname, schedule, command, active) VALUES
  ('zikr-prayer-push-dispatch', '* * * * *', 'SELECT 1', true),
  ('zikr-prayer-push-dispatch', '*/5 * * * *', 'SELECT 2', false);"
"${psql[@]}" -f /workspace/supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql
"${psql[@]}" -f /workspace/scripts/tests/prayer-push-cron-reconcile.integration.sql

# With pg_net absent in this PostgreSQL 17 fixture, the forward guard must
# remove the exact prayer dispatcher after the project-ref reconciliation.
"${psql[@]}" -f /workspace/supabase/migrations/20261117030000_guard_prayer_push_cron_without_pg_net.sql
"${psql[@]}" <<'SQL'
DO $contract$
DECLARE
  job_count integer;
BEGIN
  SELECT count(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'zikr-prayer-push-dispatch';

  IF job_count <> 0 THEN
    RAISE EXCEPTION 'expected the pg_net-missing guard to remove the prayer dispatcher, found %', job_count;
  END IF;
END;
$contract$;
SQL

# If pg_cron exposes cron.job but cannot unschedule, the migration must fail
# instead of silently leaving a job that calls the unavailable pg_net function.
"${psql[@]}" -c "INSERT INTO cron.job (jobname, schedule, command, active)
VALUES ('zikr-prayer-push-dispatch', '* * * * *', 'SELECT net.http_post(''https://example.invalid'');', true);"
"${psql[@]}" -c "DROP FUNCTION cron.unschedule(bigint);"
guard_failure_log="$(mktemp)"
if "${psql[@]}" -f /workspace/supabase/migrations/20261117030000_guard_prayer_push_cron_without_pg_net.sql >"$guard_failure_log" 2>&1; then
  cat "$guard_failure_log"
  rm -f "$guard_failure_log"
  echo "Expected the pg_net guard to fail when cron.unschedule(bigint) is unavailable." >&2
  exit 1
fi
if ! grep -Fq "cannot safely disable the ZIKR prayer dispatcher" "$guard_failure_log"; then
  cat "$guard_failure_log"
  rm -f "$guard_failure_log"
  echo "The pg_net guard failed for an unexpected reason." >&2
  exit 1
fi
rm -f "$guard_failure_log"
remaining_jobs="$("${psql[@]}" -At -c "SELECT count(*) FROM cron.job WHERE jobname = 'zikr-prayer-push-dispatch';")"
if [[ "$remaining_jobs" != "1" ]]; then
  echo "Expected the failed guard to leave the cron row untouched; found $remaining_jobs row(s)." >&2
  exit 1
fi

echo "Prayer push cron reconciliation integration passed."
