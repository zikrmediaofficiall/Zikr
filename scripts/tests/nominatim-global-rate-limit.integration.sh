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
"${psql[@]}" -f /workspace/scripts/tests/nominatim-global-rate-limit.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261008082029_20261008110000_restore_admin_rate_limit_contract.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116210000_nominatim_global_min_interval.sql
"${psql[@]}" -f /workspace/scripts/tests/nominatim-global-rate-limit.integration.sql

echo "Nominatim global minimum-interval PostgreSQL integration passed."
