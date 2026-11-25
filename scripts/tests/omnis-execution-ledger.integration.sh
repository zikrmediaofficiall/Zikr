#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-omnis-ledger-test-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
DB_NAME="zikr_omnis_ledger_test"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB="$DB_NAME" \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL OMNIS ledger test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DB_NAME")
"${psql[@]}" -f /workspace/scripts/tests/omnis-execution-ledger.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261125045720_zikr_omnis_execution_ledger.sql
# A second replay proves schema creation and task seeding are idempotent.
"${psql[@]}" -f /workspace/supabase/migrations/20261125045720_zikr_omnis_execution_ledger.sql
"${psql[@]}" -f /workspace/scripts/tests/omnis-execution-ledger.integration.sql

echo "OMNIS execution-ledger PostgreSQL 17 integration passed."
