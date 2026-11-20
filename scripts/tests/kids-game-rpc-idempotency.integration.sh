#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="zikr-kids-rpc-idempotency-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=zikr_kids_rpc_test \
  --volume "$ROOT_DIR:/workspace:ro" \
  postgres:17 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d zikr_kids_rpc_test -c "SELECT 1" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  docker logs "$CONTAINER_NAME"
  echo "PostgreSQL RPC idempotency test container did not become ready." >&2
  exit 1
fi

psql=(docker exec "$CONTAINER_NAME" psql -X -q -v ON_ERROR_STOP=1 -A -t -F '|' -U postgres -d zikr_kids_rpc_test)
"${psql[@]}" -f /workspace/scripts/tests/kids-game-rpc-idempotency.integration-setup.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261101090000_harden_kids_game_result_insert_contract.sql
"${psql[@]}" -f /workspace/supabase/migrations/20261116180000_serialize_kids_game_result_idempotency.sql

"${psql[@]}" -c "DO \$\$
BEGIN
  IF has_function_privilege(
    'authenticated',
    'public.kids_record_game_result_internal(uuid,text,text,integer,integer,integer,text,smallint,integer,boolean,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated unexpectedly has EXECUTE on the internal result RPC';
  END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.kids_record_game_result_internal(uuid,text,text,integer,integer,integer,text,smallint,integer,boolean,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role lacks EXECUTE on the internal result RPC';
  END IF;
END;
\$\$;"

query="SET ROLE service_role; SELECT duplicate FROM public.kids_record_game_result_internal('11111111-1111-4111-8111-111111111111', 'zikr-runner', 'concurrent-submission-0001', 1200, 4, 250, 'normal', 3::smallint, 2, true, '{}'::jsonb); RESET ROLE;"
pids=()
for index in $(seq 1 12); do
  "${psql[@]}" -c "$query" > "$TMP_DIR/result-$index.txt" 2>&1 &
  pids+=("$!")
done

failed=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    failed=1
  fi
done

if [[ "$failed" == "1" ]]; then
  echo "One or more concurrent result RPC calls failed:" >&2
  for output in "$TMP_DIR"/result-*.txt; do
    echo "--- $output" >&2
    cat "$output" >&2
  done
  exit 1
fi

false_count=0
true_count=0
for output in "$TMP_DIR"/result-*.txt; do
  value="$(grep -E '^[ft]$' "$output" | tail -n 1 || true)"
  case "$value" in
    f) false_count=$((false_count + 1)) ;;
    t) true_count=$((true_count + 1)) ;;
    *)
      echo "Unexpected RPC result in $output:" >&2
      cat "$output" >&2
      exit 1
      ;;
  esac
done

[[ "$false_count" == "1" ]] || {
  echo "Expected exactly one non-duplicate result; got $false_count." >&2
  exit 1
}
[[ "$true_count" == "11" ]] || {
  echo "Expected eleven duplicate results; got $true_count." >&2
  exit 1
}

result_count="$("${psql[@]}" -c "SELECT count(*) FROM public.kids_game_results WHERE user_id = '11111111-1111-4111-8111-111111111111' AND client_submission_id = 'concurrent-submission-0001';")"
player_state="$("${psql[@]}" -c "SELECT total_games || '|' || xp FROM public.kids_player_progress WHERE user_id = '11111111-1111-4111-8111-111111111111';")"
game_state="$("${psql[@]}" -c "SELECT play_count || '|' || total_plays || '|' || xp FROM public.kids_game_progress WHERE user_id = '11111111-1111-4111-8111-111111111111' AND game_id = 'zikr-runner';")"

[[ "$result_count" == "1" ]] || {
  echo "Expected one stored result row; got $result_count." >&2
  exit 1
}
[[ "$player_state" == "1|14" ]] || {
  echo "Expected player progress total_games/xp=1|14; got $player_state." >&2
  exit 1
}
[[ "$game_state" == "1|1|14" ]] || {
  echo "Expected per-game progress play_count/total_plays/xp=1|1|14; got $game_state." >&2
  exit 1
}

echo "KIDS_GAME_RPC_IDEMPOTENCY_INTEGRATION_PASSED"
