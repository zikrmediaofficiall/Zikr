#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-nominatim-rate-limit-test-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=zikr_nominatim_test \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d zikr_nominatim_test >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL Nominatim rate-limit test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d zikr_nominatim_test)

"${psql[@]}" <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$roles$;
SQL

"${psql[@]}" -f /workspace/supabase/migrations/20261008082029_20261008110000_restore_admin_rate_limit_contract.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116210000_nominatim_global_min_interval.sql

"${psql[@]}" <<'SQL'
DO $privileges$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.consume_min_interval_rate_limit(uuid,text,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must not execute the minimum-interval limiter';
  END IF;
  IF has_function_privilege(
    'authenticated',
    'public.consume_min_interval_rate_limit(uuid,text,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated must not execute the minimum-interval limiter';
  END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.consume_min_interval_rate_limit(uuid,text,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role must execute the minimum-interval limiter';
  END IF;
END
$privileges$;
SQL

ACTOR="11111111-1111-4111-8111-111111111111"
BUCKET="nominatim_global_integration"

run_slot() {
  "${psql[@]}" -c "SET ROLE service_role; SELECT public.consume_min_interval_rate_limit('$ACTOR'::uuid, '$BUCKET', 1000);"
}

first="$(run_slot)"
second="$(run_slot)"
if [[ "$first" != "t" || "$second" != "f" ]]; then
  echo "Expected the first request to pass and an immediate second request to be denied; got '$first' and '$second'." >&2
  exit 1
fi

sleep 1.05
third="$(run_slot)"
if [[ "$third" != "t" ]]; then
  echo "Expected a request after the one-second minimum interval to pass; got '$third'." >&2
  exit 1
fi

echo "Nominatim global minimum-interval PostgreSQL integration passed."
