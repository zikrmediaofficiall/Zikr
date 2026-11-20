\set ON_ERROR_STOP on

SET ROLE service_role;

DO $invalid_arguments$
DECLARE
  v_actor uuid := '11111111-1111-4111-8111-111111111111';
  v_allowed boolean;
  v_rows integer;
BEGIN
  v_allowed := public.consume_admin_rate_limit(NULL::uuid, 'null-actor', 1, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'NULL actor must fail closed';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, NULL::text, 1, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'NULL bucket must fail closed';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, '   ', 1, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'blank bucket must fail closed';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, 'null-limit', NULL::integer, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'NULL limit must fail closed as FALSE, not NULL';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, 'null-window', 1, NULL::integer);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'NULL window must fail closed as FALSE without raising';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, 'zero-limit', 0, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'zero limit must fail closed';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, 'zero-window', 1, 0);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'zero window must fail closed';
  END IF;

  SELECT count(*) INTO v_rows
  FROM public.admin_rate_limits
  WHERE actor_id = v_actor;

  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'invalid arguments mutated the rate-limit table (% rows)', v_rows;
  END IF;
END
$invalid_arguments$;

DO $valid_arguments$
DECLARE
  v_actor uuid := '22222222-2222-4222-8222-222222222222';
  v_allowed boolean;
  v_count integer;
BEGIN
  v_allowed := public.consume_admin_rate_limit(v_actor, 'valid-contract', 1, 60);
  IF v_allowed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'first valid request must be allowed';
  END IF;

  v_allowed := public.consume_admin_rate_limit(v_actor, 'valid-contract', 1, 60);
  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'request beyond the configured limit must be denied';
  END IF;

  SELECT request_count INTO v_count
  FROM public.admin_rate_limits
  WHERE actor_id = v_actor
    AND bucket = 'valid-contract';

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'valid requests must be counted atomically; expected 2, found %', v_count;
  END IF;
END
$valid_arguments$;

RESET ROLE;

DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.consume_admin_rate_limit(uuid, text, integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute the shared rate-limit RPC';
  END IF;
  IF has_function_privilege('authenticated', 'public.consume_admin_rate_limit(uuid, text, integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute the shared rate-limit RPC';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.consume_admin_rate_limit(uuid, text, integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must retain the shared rate-limit RPC permission';
  END IF;
END
$permissions$;

SELECT 'ADMIN_RATE_LIMIT_ARGUMENTS_INTEGRATION_PASSED' AS result;
