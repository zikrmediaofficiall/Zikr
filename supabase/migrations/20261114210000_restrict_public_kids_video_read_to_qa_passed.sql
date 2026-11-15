-- Keep unreviewed or malformed Kids video metadata private even when a legacy row is
-- marked published. Only canonical general rows (or legacy rows without an audience)
-- and Kids rows with the complete internal QA contract are publicly readable.
-- Unknown audience labels and non-object metadata fail closed.
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
      metadata IS NULL
      OR (
        jsonb_typeof(metadata) = 'object'
        AND (
          (
            metadata->>'audience' IS NULL
            AND metadata->>'generator' IS DISTINCT FROM 'zikr_internal_video_factory'
          )
          OR metadata->>'audience' = 'general'
          OR (
            metadata->>'audience' = 'kids'
            AND metadata->>'generator' = 'zikr_internal_video_factory'
            AND metadata->>'kidsVideoQaStatus' = 'passed'
            AND metadata->'automatedVideoQa'->>'status' = 'passed'
          )
        )
      )
    )
  );

COMMIT;
