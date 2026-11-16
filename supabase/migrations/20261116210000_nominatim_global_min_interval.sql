BEGIN;

-- The generic admin limiter uses fixed windows. A one-request/one-second
-- fixed window can still admit two requests milliseconds apart at a boundary.
-- Keep one stable row per actor/bucket and serialize callers so this is a true
-- minimum interval, not a per-window count.
CREATE OR REPLACE FUNCTION public.consume_min_interval_rate_limit(
  p_actor uuid,
  p_bucket text,
  p_interval_ms integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_slot CONSTANT timestamptz := '1970-01-01 00:00:00+00'::timestamptz;
  v_now timestamptz;
  v_last_request_at timestamptz;
BEGIN
  IF p_actor IS NULL
     OR coalesce(length(trim(p_bucket)), 0) = 0
     OR p_interval_ms IS NULL
     OR p_interval_ms < 1
     OR p_interval_ms > 60000 THEN
    RETURN false;
  END IF;

  -- This also serializes the first insert when the stable row does not exist.
  PERFORM pg_advisory_xact_lock(hashtext(p_actor::text), hashtext(p_bucket));
  v_now := clock_timestamp();

  SELECT updated_at
    INTO v_last_request_at
    FROM public.admin_rate_limits
   WHERE actor_id = p_actor
     AND bucket = p_bucket
     AND window_started_at = v_slot
   FOR UPDATE;

  IF FOUND THEN
    IF v_last_request_at > v_now - (p_interval_ms * interval '1 millisecond') THEN
      RETURN false;
    END IF;

    UPDATE public.admin_rate_limits
       SET request_count = request_count + 1,
           updated_at = v_now
     WHERE actor_id = p_actor
       AND bucket = p_bucket
       AND window_started_at = v_slot;
  ELSE
    INSERT INTO public.admin_rate_limits (
      actor_id,
      bucket,
      window_started_at,
      request_count,
      created_at,
      updated_at
    )
    VALUES (
      p_actor,
      p_bucket,
      v_slot,
      1,
      v_now,
      v_now
    );
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_min_interval_rate_limit(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_min_interval_rate_limit(uuid, text, integer)
  TO service_role;

COMMENT ON FUNCTION public.consume_min_interval_rate_limit(uuid, text, integer) IS
  'Atomically permits one service-role request per actor/bucket minimum interval using a transaction lock and clock_timestamp.';

COMMIT;
