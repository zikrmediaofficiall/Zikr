-- Require the complete Kids publication contract after all preceding migrations.
-- Preserve media, source, series, automated-QA and matching human-review checks;
-- a later migration must never weaken the policy established by prior hardening.
BEGIN;

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
            AND metadata->>'videoGenerationRequestId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND metadata->>'generatedVideoUrl' IS NOT NULL
            AND metadata->>'mediaState' = 'cloudinary_master'
            AND metadata->>'sourceMediaMissing' IS DISTINCT FROM 'true'
            AND metadata->>'sourceHash' IS NOT NULL
            AND metadata->>'contentHash' IS NOT NULL
            AND metadata->>'templateVersion' IS NOT NULL
            AND metadata->>'kidsVideoQaStatus' = 'passed'
            AND metadata->'automatedVideoQa'->>'status' = 'passed'
            AND metadata->'automatedVideoQa'->>'snapshotHash' ~ '^[a-f0-9]{64}$'
            AND metadata->>'approvalStatus' = 'approved'
            AND metadata->>'approvalReviewerId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
            AND metadata->>'approvalReviewedAt' IS NOT NULL
            AND metadata->>'approvalSnapshotHash' = metadata->'automatedVideoQa'->>'snapshotHash'
            AND metadata->>'approvalSnapshotHash' ~ '^[a-f0-9]{64}$'
            AND jsonb_typeof(metadata->'qualityReview') = 'object'
            AND metadata->'qualityReview'->>'mode' = 'human'
            AND metadata->'qualityReview'->>'reviewerId' = metadata->>'approvalReviewerId'
            AND metadata->'qualityReview'->>'reviewedAt' = metadata->>'approvalReviewedAt'
            AND metadata->'qualityReview'->>'sourceVerified' = 'true'
            AND metadata->'qualityReview'->>'audioReviewed' = 'true'
            AND metadata->'qualityReview'->>'visualsReviewed' = 'true'
            AND metadata->'qualityReview'->>'captionsReviewed' = 'true'
            AND metadata->'qualityReview'->>'rightsReviewed' = 'true'
            AND metadata->>'contentFormat' = 'series_episode'
            AND metadata->>'aiMode' = 'original_kids_story'
            AND metadata->>'sourceType' = 'original_kids_fiction'
            AND nullif(btrim(metadata->>'seriesId'), '') IS NOT NULL
            AND nullif(btrim(metadata->>'seriesTitle'), '') IS NOT NULL
            AND nullif(btrim(metadata->>'learningObjective'), '') IS NOT NULL
            AND coalesce(metadata->>'seasonNumber', '') ~ '^[1-9][0-9]*$'
            AND coalesce(metadata->>'episodeNumber', '') ~ '^[1-9][0-9]*$'
          )
        )
      )
    )
  );

            AND metadata->>'approvalReviewerId' <> 'system:zikr-video-factory'
            AND metadata->>'approvalReviewedAt' IS NOT NULL
            AND metadata->>'approvalSnapshotHash' = metadata->'automatedVideoQa'->>'snapshotHash'
            AND metadata->>'approvalSnapshotHash' ~ '^[a-f0-9]{64}$'
            AND jsonb_typeof(metadata->'qualityReview') = 'object'
            AND metadata->'qualityReview'->>'mode' = 'human'
            AND metadata->'qualityReview'->>'reviewerId' = metadata->>'approvalReviewerId'
            AND metadata->'qualityReview'->>'reviewedAt' = metadata->>'approvalReviewedAt'
            AND metadata->'qualityReview'->>'sourceVerified' = 'true'
            AND metadata->'qualityReview'->>'audioReviewed' = 'true'
            AND metadata->'qualityReview'->>'visualsReviewed' = 'true'
            AND metadata->'qualityReview'->>'captionsReviewed' = 'true'
            AND metadata->'qualityReview'->>'rightsReviewed' = 'true'
            AND metadata->>'contentFormat' = 'series_episode'
            AND metadata->>'aiMode' = 'original_kids_story'
            AND metadata->>'sourceType' = 'original_kids_fiction'
            AND nullif(btrim(metadata->>'seriesId'), '') IS NOT NULL
            AND nullif(btrim(metadata->>'seriesTitle'), '') IS NOT NULL
            AND nullif(btrim(metadata->>'learningObjective'), '') IS NOT NULL
            AND coalesce(metadata->>'seasonNumber', '') ~ '^[1-9][0-9]*$'
            AND coalesce(metadata->>'episodeNumber', '') ~ '^[1-9][0-9]*$'
          )
        )
      )
    )
  );


COMMENT ON POLICY videos_public_read ON public.videos IS
  'Public reads include legacy/general videos and Kids videos only after complete automated QA, media/source checks, and matching human approval metadata.';

COMMIT;
