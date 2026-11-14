-- Keep unreviewed Kids video metadata private even when a legacy row is
-- marked published. The public Kids feed already requires the same factory
-- marker and QA status; this RLS policy makes direct PostgREST reads agree.
-- No video rows or Storage objects are changed or deleted.
BEGIN;

DROP POLICY IF EXISTS videos_public_read ON public.videos;

CREATE POLICY videos_public_read
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (
    published IS TRUE
    AND (
      lower(btrim(coalesce(metadata->>'audience', ''))) <> 'kids'
      OR (
        metadata->>'generator' = 'zikr_internal_video_factory'
        AND metadata->>'kidsVideoQaStatus' = 'passed'
        AND metadata->'automatedVideoQa'->>'status' = 'passed'
      )
    )
  );

COMMIT;
