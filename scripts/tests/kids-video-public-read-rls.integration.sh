#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-kids-video-public-rls-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=zikr_kids_video_public_rls_test \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d zikr_kids_video_public_rls_test -c "SELECT 1" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL public video audience RLS test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -v ON_ERROR_STOP=1 -U postgres -d zikr_kids_video_public_rls_test)
"${psql[@]}" -f /workspace/scripts/tests/kids-video-public-read-rls.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261114210000_restrict_public_kids_video_read_to_qa_passed.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261115170000_restrict_public_kids_video_read_to_human_approval.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261115215300_require_human_approval_for_public_kids_videos.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116043000_restrict_public_video_reads_from_kids_markers.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116045100_require_linked_request_for_public_kids_videos.sql
"${psql[@]}" -f /workspace/scripts/tests/kids-video-public-read-rls.integration.sql

echo "Public video audience RLS integration passed."
