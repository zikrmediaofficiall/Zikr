\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  IF (SELECT count(*) FROM public.video_like_counts) <> 1 THEN
    RAISE EXCEPTION 'Anonymous clients must see aggregate counts only for videos visible through videos RLS';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.video_like_counts
    WHERE video_id = '91000000-0000-4000-8000-000000000002'
  ) THEN
    RAISE EXCEPTION 'Anonymous clients must not read counts for unpublished videos';
  END IF;
END
$anon$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '92000000-0000-4000-8000-000000000001';
DO $authenticated$
BEGIN
  IF (SELECT count(*) FROM public.video_like_counts) <> 1 THEN
    RAISE EXCEPTION 'Authenticated clients must see aggregate counts only for visible videos';
  END IF;

  BEGIN
    INSERT INTO public.video_likes (video_id, user_id)
    VALUES (
      '91000000-0000-4000-8000-000000000002',
      '92000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'Authenticated clients must not create likes for unpublished videos';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  INSERT INTO public.video_likes (video_id, user_id)
  VALUES (
    '91000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.video_likes
    WHERE video_id = '91000000-0000-4000-8000-000000000001'
      AND user_id = '92000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Authenticated clients must still be able to like visible videos as themselves';
  END IF;
END
$authenticated$;
COMMIT;
