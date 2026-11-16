-- Treat the canonical Kids video category as child-directed even when legacy
-- catalog metadata is absent, malformed, or incorrectly claims general audience.
-- This adds a restrictive read guard only; it does not modify catalog rows or media.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.video_category_is_kids(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.video_categories AS category
    WHERE category.id = p_category_id
      AND pg_catalog.lower(pg_catalog.btrim(coalesce(category.slug, ''))) = ANY (
        ARRAY[
          'kids-stories',
          'kids-story',
          'kids_story',
          'kids_video',
          'kids',
          'kid',
          'children',
          'child'
        ]
      )
  );
$function$;

ALTER FUNCTION private.video_category_is_kids(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.video_category_is_kids(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.video_category_is_kids(uuid) TO anon, authenticated;

COMMENT ON FUNCTION private.video_category_is_kids(uuid) IS
  'Returns only whether a video category ID is child-directed. SECURITY DEFINER bypasses category visibility RLS so hidden/inactive Kids categories cannot make their videos appear general.';

DROP POLICY IF EXISTS videos_kids_category_requires_current_human_approval ON public.videos;

CREATE POLICY videos_kids_category_requires_current_human_approval
  ON public.videos
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    NOT private.video_category_is_kids(category_id)
    OR (
      pg_catalog.jsonb_typeof(metadata) = 'object'
      AND metadata->>'audience' = 'kids'
      AND metadata->>'generator' = 'zikr_internal_video_factory'
      AND metadata->>'videoGenerationRequestId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND nullif(pg_catalog.btrim(metadata->>'generatedVideoUrl'), '') LIKE 'https://res.cloudinary.com/%'
      AND metadata->>'mediaState' = 'cloudinary_master'
      AND metadata->>'sourceMediaMissing' IS DISTINCT FROM 'true'
      AND nullif(pg_catalog.btrim(metadata->>'sourceHash'), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(metadata->>'contentHash'), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(metadata->>'templateVersion'), '') IS NOT NULL
      AND metadata->>'contentFormat' = 'series_episode'
      AND metadata->>'aiMode' = 'original_kids_story'
      AND metadata->>'sourceType' = 'original_kids_fiction'
      AND nullif(pg_catalog.btrim(metadata->>'seriesId'), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(metadata->>'seriesTitle'), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(metadata->>'learningObjective'), '') IS NOT NULL
      AND coalesce(metadata->>'seasonNumber', '') ~ '^[1-9][0-9]{0,3}$'
      AND coalesce(metadata->>'episodeNumber', '') ~ '^[1-9][0-9]{0,3}$'
      AND metadata->>'kidsVideoQaStatus' = 'passed'
      AND metadata->'automatedVideoQa'->>'status' = 'passed'
      AND metadata->'automatedVideoQa'->>'snapshotHash' ~ '^[a-f0-9]{64}$'
      AND metadata->>'approvalStatus' = 'approved'
      AND metadata->>'approvalReviewerId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND nullif(pg_catalog.btrim(metadata->>'approvalReviewedAt'), '') IS NOT NULL
      AND metadata->>'approvalSnapshotHash' = metadata->'automatedVideoQa'->>'snapshotHash'
      AND metadata->>'approvalSnapshotHash' ~ '^[a-f0-9]{64}$'
      AND pg_catalog.jsonb_typeof(metadata->'qualityReview') = 'object'
      AND metadata->'qualityReview'->>'mode' = 'human'
      AND metadata->'qualityReview'->>'reviewerId' = metadata->>'approvalReviewerId'
      AND metadata->'qualityReview'->>'reviewedAt' = metadata->>'approvalReviewedAt'
      AND metadata->'qualityReview'->>'sourceVerified' = 'true'
      AND metadata->'qualityReview'->>'audioReviewed' = 'true'
      AND metadata->'qualityReview'->>'visualsReviewed' = 'true'
      AND metadata->'qualityReview'->>'captionsReviewed' = 'true'
      AND metadata->'qualityReview'->>'rightsReviewed' = 'true'
      AND private.video_catalog_has_current_human_kids_approval(metadata)
    )
  );

COMMENT ON POLICY videos_kids_category_requires_current_human_approval ON public.videos IS
  'Restrictive defense-in-depth: videos assigned to any canonical Kids category remain private unless the catalog metadata and linked generation request satisfy the complete current human-approval and media contract.';

COMMIT;
