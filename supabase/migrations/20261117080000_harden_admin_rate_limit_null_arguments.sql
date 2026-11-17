-- Make the server-only shared rate limiter fail closed for nullable RPC arguments.
-- PostgreSQL three-valued logic means "p_limit < 1" and "p_window_seconds < 1"
-- do not reject NULL. Without explicit NULL checks a NULL limit consumes a row
-- and returns NULL, while a NULL window attempts an INSERT with a NULL primary
-- key component. Validate all inputs before any rate-limit state is mutated.

CREATE OR REPLACE FUNCTION public.consume_admin_rate_limit(
  p_actor uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_window_started_at timestamptz;
  v_request_count integer;
BEGIN
  IF p_actor IS NULL
     OR COALESCE(length(trim(p_bucket)), 0) = 0
     OR p_limit IS NULL
     OR p_limit < 1
     OR p_window_seconds IS NULL
     OR p_window_seconds < 1 THEN
    RETURN FALSE;
  END IF;

  v_window_started_at :=
    to_timestamp(
      floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
    );

  DELETE FROM public.admin_rate_limits
  WHERE actor_id = p_actor
    AND bucket = p_bucket
    AND window_started_at < now() - interval '1 day';

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
    v_window_started_at,
    1,
    now(),
    now()
  )
  ON CONFLICT (actor_id, bucket, window_started_at)
  DO UPDATE
    SET request_count = public.admin_rate_limits.request_count + 1,
        updated_at = now()
  RETURNING request_count INTO v_request_count;

  RETURN v_request_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_admin_rate_limit(uuid, text, integer, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_admin_rate_limit(uuid, text, integer, integer)
  TO service_role;

COMMENT ON FUNCTION public.consume_admin_rate_limit(uuid, text, integer, integer) IS
  'Atomically consumes one server-side rate-limit token; invalid or NULL arguments fail closed without mutating counters.';
