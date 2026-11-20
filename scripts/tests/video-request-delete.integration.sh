#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-video-request-delete-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
cleanup() { docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=zikr_video_delete_test \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d zikr_video_delete_test >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL video-request delete test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -v ON_ERROR_STOP=1 -U postgres -d zikr_video_delete_test)
"${psql[@]}" -f /workspace/scripts/tests/video-request-delete.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116090000_admin_delete_unreferenced_video_generation_request.sql
"${psql[@]}" -f /workspace/scripts/tests/video-request-delete.integration.sql

# A queue reference that commits first must make the waiting deletion fail.
"${psql[@]}" -c "INSERT INTO public.video_generation_requests (id, updated_at, status) VALUES ('10000000-0000-4000-8000-000000000007', '2026-11-01T00:00:00Z', 'failed')"
"${psql[@]}" > /tmp/zikr-video-reference-first.log 2>&1 <<'SQL' &
BEGIN;
INSERT INTO public.social_publish_queue (content_id)
VALUES ('10000000-0000-4000-8000-000000000007');
SELECT pg_sleep(2);
COMMIT;
SQL
reference_pid=$!
sleep 0.25
"${psql[@]}" <<'SQL'
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000007', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'delete unexpectedly passed a concurrent committed reference';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END;
$$;
SQL
wait "$reference_pid"

# A deletion that obtains the advisory lock first must make the waiting
# reference insert fail after the request is committed as deleted.
"${psql[@]}" -c "INSERT INTO public.video_generation_requests (id, updated_at, status) VALUES ('10000000-0000-4000-8000-000000000008', '2026-11-01T00:00:00Z', 'failed')"
"${psql[@]}" > /tmp/zikr-video-delete-first.log 2>&1 <<'SQL' &
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('10000000-0000-4000-8000-000000000008', 741953)
);
SELECT * FROM public.admin_delete_unreferenced_video_generation_request(
  '10000000-0000-4000-8000-000000000008', '2026-11-01T00:00:00Z'
);
SELECT pg_sleep(2);
COMMIT;
SQL
delete_pid=$!
sleep 0.25
"${psql[@]}" <<'SQL'
DO $$
BEGIN
  BEGIN
    INSERT INTO public.social_publish_queue (content_id)
    VALUES ('10000000-0000-4000-8000-000000000008');
    RAISE EXCEPTION 'reference unexpectedly passed a concurrent committed deletion';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END;
$$;
SQL
wait "$delete_pid"
echo "VIDEO_REQUEST_REFERENCE_RACE_INTEGRATION_PASSED"
