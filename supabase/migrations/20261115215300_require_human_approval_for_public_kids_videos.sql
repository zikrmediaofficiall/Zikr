-- Public Kids video reads require the same human approval contract used by
-- the atomic admin approval RPC. Automated QA alone is not a public release gate.
-- General and legacy non-internal videos retain their existing visibility rules.
-- This migration changes only the SELECT policy; it does not update or delete rows.
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
            AND jsonb_typeof(metadata->'automatedVideoQa') = 'object'
            AND metadata->'automatedVideoQa'->>'status' = 'passed'
            AND metadata->'automatedVideoQa'->>'snapshotHash' = metadata->>'approvalSnapshotHash'
            AND metadata->>'approvalStatus' = 'approved'
            AND metadata->>'approvalReviewerId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND metadata->>'approvalReviewerId' <> 'system:zikr-video-factory'
            AND nullif(btrim(metadata->>'approvalReviewedAt'), '') IS NOT NULL
            AND metadata->>'approvalSnapshotHash' ~ '^[a-f0-9]{64}$'
            AND metadata->>'videoGenerationRequestId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND jsonb_typeof(metadata->'qualityReview') = 'object'
            AND metadata->'qualityReview'->>'mode' = 'human'
            AND metadata->'qualityReview'->>'reviewerId' = metadata->>'approvalReviewerId'
            AND metadata->'qualityReview'->>'reviewedAt' = metadata->>'approvalReviewedAt'
            AND metadata->'qualityReview'->>'sourceVerified' = 'true'
            AND metadata->'qualityReview'->>'audioReviewed' = 'true'
            AND metadata->'qualityReview'->>'visualsReviewed' = 'true'
            AND metadata->'qualityReview'->>'captionsReviewed' = 'true'
            AND metadata->'qualityReview'->>'rightsReviewed' = 'true'
          )
        )
      )
    )
  );

COMMENT ON POLICY videos_public_read ON public.videos IS
  'Public reads include legacy/general videos and Kids videos only after passed automated QA plus matching human approval metadata.';

COMMIT;
