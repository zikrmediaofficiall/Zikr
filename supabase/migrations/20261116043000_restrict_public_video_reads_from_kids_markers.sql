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
            metadata->>'audience' = 'kids'
            AND metadata->>'generator' = 'zikr_internal_video_factory'
            AND metadata->>'videoGenerationRequestId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            AND metadata->>'generatedVideoUrl' LIKE 'https://res.cloudinary.com/%'
            AND metadata->>'mediaState' = 'cloudinary_master'
            AND metadata->>'sourceMediaMissing' IS DISTINCT FROM 'true'
            AND coalesce(metadata->>'sourceHash', '') <> ''
            AND coalesce(metadata->>'contentHash', '') <> ''
            AND coalesce(metadata->>'templateVersion', '') <> ''
            AND metadata->>'contentFormat' = 'series_episode'
            AND metadata->>'aiMode' = 'original_kids_story'
            AND metadata->>'sourceType' = 'original_kids_fiction'
            AND coalesce(metadata->>'seriesId', '') <> ''
            AND coalesce(metadata->>'seriesTitle', '') <> ''
            AND coalesce(metadata->>'learningObjective', '') <> ''
            AND coalesce(metadata->>'seasonNumber', '') ~ '^[0-9]+$'
            AND coalesce(metadata->>'episodeNumber', '') ~ '^[0-9]+$'
            AND (metadata->>'seasonNumber')::integer >= 1
            AND (metadata->>'episodeNumber')::integer >= 1
            AND metadata->>'kidsVideoQaStatus' = 'passed'
            AND metadata->'automatedVideoQa'->>'status' = 'passed'
            AND metadata->'automatedVideoQa'->>'snapshotHash' ~ '^[0-9a-f]{64}$'
            AND metadata->>'approvalStatus' = 'approved'
            AND metadata->>'approvalReviewerId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            AND coalesce(metadata->>'approvalReviewedAt', '') <> ''
            AND metadata->>'approvalSnapshotHash' ~ '^[0-9a-f]{64}$'
            AND metadata->'automatedVideoQa'->>'snapshotHash' = metadata->>'approvalSnapshotHash'
            AND metadata->'qualityReview'->>'mode' = 'human'
            AND metadata->'qualityReview'->>'reviewerId' = metadata->>'approvalReviewerId'
            AND metadata->'qualityReview'->>'reviewedAt' = metadata->>'approvalReviewedAt'
            AND metadata->'qualityReview'->>'sourceVerified' = 'true'
            AND metadata->'qualityReview'->>'audioReviewed' = 'true'
            AND metadata->'qualityReview'->>'visualsReviewed' = 'true'
            AND metadata->'qualityReview'->>'captionsReviewed' = 'true'
            AND metadata->'qualityReview'->>'rightsReviewed' = 'true'
          )
          OR (
            NOT (
              lower(btrim(coalesce(metadata->>'audience', ''))) IN ('kids', 'kid', 'children', 'child')
              OR lower(btrim(coalesce(metadata->>'category', ''))) IN ('kids', 'kid', 'children', 'child', 'kids_story', 'kids_video')
              OR lower(btrim(coalesce(metadata->>'sourceType', ''))) IN ('original_kids_fiction', 'kids_story', 'kids_story_episode')
              OR lower(btrim(coalesce(metadata->>'aiMode', ''))) = 'original_kids_story'
              OR lower(btrim(coalesce(metadata->>'type', ''))) IN ('kids_story', 'kids_story_episode', 'kids_video', 'kids_story_video')
              OR lower(btrim(coalesce(metadata->>'contentType', ''))) IN ('kids_video', 'kids_story_video')
              OR lower(btrim(coalesce(metadata->>'generationMode', ''))) = 'free_deterministic_story_factory'
              OR lower(btrim(coalesce(metadata->>'sourceId', ''))) LIKE 'kids-series:%'
              OR lower(btrim(coalesce(metadata->>'curatedSourceId', ''))) LIKE 'kids-series:%'
              OR (
                nullif(btrim(metadata->>'publicPath'), '') IS NOT NULL
                AND (
                  lower(split_part(split_part(btrim(metadata->>'publicPath'), '?', 1), '#', 1)) ~ '(^|/)kids(/|$)'
                  OR position('%' in coalesce(metadata->>'publicPath', '')) > 0
                  OR position(chr(92) in coalesce(metadata->>'publicPath', '')) > 0
                )
              )
              OR (
                nullif(btrim(metadata->>'public_path'), '') IS NOT NULL
                AND (
                  lower(split_part(split_part(btrim(metadata->>'public_path'), '?', 1), '#', 1)) ~ '(^|/)kids(/|$)'
                  OR position('%' in coalesce(metadata->>'public_path', '')) > 0
                  OR position(chr(92) in coalesce(metadata->>'public_path', '')) > 0
                )
              )
              OR (
                metadata->>'audience' IS NULL
                AND lower(btrim(coalesce(metadata->>'sourceType', ''))) = 'story'
                AND lower(btrim(coalesce(metadata->>'type', ''))) = 'story'
              )
            )
            AND (
              (
                metadata->>'audience' IS NULL
                AND metadata->>'generator' IS DISTINCT FROM 'zikr_internal_video_factory'
              )
              OR metadata->>'audience' = 'general'
            )
          )
        )
      )
    )
  );

COMMENT ON POLICY videos_public_read ON public.videos IS
  'Public video reads allow legacy/general content only when no child-directed provenance marker conflicts, and Kids content only after complete automated QA plus matching human approval.';

COMMIT;
