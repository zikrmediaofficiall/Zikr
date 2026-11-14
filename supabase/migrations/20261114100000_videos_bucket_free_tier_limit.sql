-- The connected Supabase organization is on the Free plan, whose per-file
-- Storage ceiling is 50 MiB. The original videos bucket was configured for
-- 512 MiB, which exceeds the active project limit and causes uploads above
-- 50 MiB to fail at Storage. Keep the UI, API, local config and live bucket aligned.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'videos') THEN
    RAISE EXCEPTION 'Required Storage bucket "videos" is missing; refusing to create or reconfigure it implicitly.';
  END IF;
END;
$$;

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'videos'
  AND file_size_limit IS DISTINCT FROM 52428800;

DO $$
DECLARE
  configured_limit bigint;
BEGIN
  SELECT file_size_limit INTO configured_limit
  FROM storage.buckets
  WHERE id = 'videos';

  IF configured_limit IS DISTINCT FROM 52428800 THEN
    RAISE EXCEPTION 'Video Storage bucket limit must be 50 MiB; observed %.', configured_limit;
  END IF;
END;
$$;

COMMIT;
