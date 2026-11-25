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

SET ROLE service_role;

DO $minimum_interval$
DECLARE
  v_actor constant uuid := '11111111-1111-4111-8111-111111111111';
  v_bucket constant text := 'nominatim_global_integration';
  v_first boolean;
  v_second boolean;
  v_third boolean;
BEGIN
  v_first := public.consume_min_interval_rate_limit(v_actor, v_bucket, 1000);
  v_second := public.consume_min_interval_rate_limit(v_actor, v_bucket, 1000);

  IF v_first IS DISTINCT FROM true OR v_second IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Expected first request true and immediate second request false; got % and %', v_first, v_second;
  END IF;

  PERFORM pg_sleep(1.05);
  v_third := public.consume_min_interval_rate_limit(v_actor, v_bucket, 1000);

  IF v_third IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected request after one second to pass; got %', v_third;
  END IF;
END
$minimum_interval$;

RESET ROLE;

SELECT 'NOMINATIM_GLOBAL_MIN_INTERVAL_INTEGRATION_PASSED';
