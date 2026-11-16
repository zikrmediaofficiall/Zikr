BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.video_catalog_has_current_human_kids_approval(p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN pg_catalog.jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' THEN false
    WHEN coalesce(p_metadata->>'videoGenerationRequestId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}

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
            AND CASE
              WHEN coalesce(metadata->>'seasonNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'seasonNumber')::integer >= 1
              ELSE false
            END
            AND CASE
              WHEN coalesce(metadata->>'episodeNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'episodeNumber')::integer >= 1
              ELSE false
            END
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
            AND private.video_catalog_has_current_human_kids_approval(metadata)
          )
          OR (
            NOT (
              lower(btrim(coalesce(metadata->>'audience', ''))) IN ('kids', 'kid', 'children', 'child')
              OR lower(btrim(coalesce(metadata->>'category', ''))) IN ('kids', 'kid', 'children', 'child', 'kids_story', 'kids_video')
              OR lower(btrim(coalesce(metadata->>'sourceType', ''))) IN ('original_kids_fiction', 'kids_story', 'kids_story_episode')
              OR lower(btrim(coalesce(metadata->>'aiMode', ''))) = 'original_kids_story'
              OR lower(btrim(coalesce(metadata->>'type', ''))) IN ('kids_story', 'kids_story_episode', 'kids_video', 'kids_story_video')
              OR lower(btrim(coalesce(metadata->>'contentType', ''))) IN ('kids_video', 'kids_story_video')
              OR lower(btrim(coalesce(metadata->>'contentFormat', ''))) = 'series_episode'
              OR coalesce(btrim(metadata->>'ageGroup'), '') <> ''
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
 THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.video_generation_requests AS request
      WHERE request.id = (p_metadata->>'videoGenerationRequestId')::uuid
        AND request.status = 'completed'
        AND request.video_url = p_metadata->>'generatedVideoUrl'
        AND request.source_hash = p_metadata->>'sourceHash'
        AND request.content_hash = p_metadata->>'contentHash'
        AND request.template_version = p_metadata->>'templateVersion'
        AND pg_catalog.jsonb_typeof(request.content) = 'object'
        AND request.content->>'audience' = 'kids'
        AND request.content->>'kidsVideoQaStatus' = 'passed'
        AND request.content->>'sourceHash' = request.source_hash
        AND request.content->>'contentHash' = request.content_hash
        AND request.content->>'templateVersion' = request.template_version
        AND request.content->>'generatedVideoUrl' = request.video_url
        AND request.content->>'approvalStatus' = 'approved'
        AND request.content->>'approvalReviewerId' = p_metadata->>'approvalReviewerId'
        AND request.content->>'approvalReviewerId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}

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
            AND CASE
              WHEN coalesce(metadata->>'seasonNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'seasonNumber')::integer >= 1
              ELSE false
            END
            AND CASE
              WHEN coalesce(metadata->>'episodeNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'episodeNumber')::integer >= 1
              ELSE false
            END
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
              OR lower(btrim(coalesce(metadata->>'contentFormat', ''))) = 'series_episode'
              OR coalesce(btrim(metadata->>'ageGroup'), '') <> ''
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

        AND request.content->>'approvalReviewerId' <> 'system:zikr-video-factory'
        AND nullif(btrim(request.content->>'approvalReviewedAt'), '') IS NOT NULL
        AND request.content->>'approvalReviewedAt' = p_metadata->>'approvalReviewedAt'
        AND request.content->>'approvalSnapshotHash' = p_metadata->>'approvalSnapshotHash'
        AND request.content->>'approvalSnapshotHash' ~ '^[a-f0-9]{64}

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
            AND CASE
              WHEN coalesce(metadata->>'seasonNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'seasonNumber')::integer >= 1
              ELSE false
            END
            AND CASE
              WHEN coalesce(metadata->>'episodeNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'episodeNumber')::integer >= 1
              ELSE false
            END
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
              OR lower(btrim(coalesce(metadata->>'contentFormat', ''))) = 'series_episode'
              OR coalesce(btrim(metadata->>'ageGroup'), '') <> ''
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

        AND request.content->'automatedVideoQa'->>'status' = 'passed'
        AND request.content->'automatedVideoQa'->>'snapshotHash' = p_metadata->'automatedVideoQa'->>'snapshotHash'
        AND request.content->'automatedVideoQa'->>'snapshotHash' = p_metadata->>'approvalSnapshotHash'
        AND request.content->'qualityReview'->>'mode' = 'human'
        AND request.content->'qualityReview'->>'reviewerId' = p_metadata->>'approvalReviewerId'
        AND request.content->'qualityReview'->>'reviewedAt' = p_metadata->>'approvalReviewedAt'
        AND request.content->'qualityReview'->>'sourceVerified' = 'true'
        AND request.content->'qualityReview'->>'audioReviewed' = 'true'
        AND request.content->'qualityReview'->>'visualsReviewed' = 'true'
        AND request.content->'qualityReview'->>'captionsReviewed' = 'true'
        AND request.content->'qualityReview'->>'rightsReviewed' = 'true'
        AND request.content->>'contentFormat' = p_metadata->>'contentFormat'
        AND request.content->>'aiMode' = p_metadata->>'aiMode'
        AND request.content->>'sourceType' = p_metadata->>'sourceType'
        AND request.content->>'seriesId' = p_metadata->>'seriesId'
        AND request.content->>'seriesTitle' = p_metadata->>'seriesTitle'
        AND request.content->>'learningObjective' = p_metadata->>'learningObjective'
        AND request.content->>'seasonNumber' = p_metadata->>'seasonNumber'
        AND request.content->>'episodeNumber' = p_metadata->>'episodeNumber'
    )
  END;
$function$;

ALTER FUNCTION private.video_catalog_has_current_human_kids_approval(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.video_catalog_has_current_human_kids_approval(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.video_catalog_has_current_human_kids_approval(jsonb) TO anon, authenticated;

COMMENT ON FUNCTION private.video_catalog_has_current_human_kids_approval(jsonb) IS
  'Returns true only when a published Kids video catalog row is backed by an existing completed generation request with matching media fingerprints, QA, series metadata, and human approval.';

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
            AND CASE
              WHEN coalesce(metadata->>'seasonNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'seasonNumber')::integer >= 1
              ELSE false
            END
            AND CASE
              WHEN coalesce(metadata->>'episodeNumber', '') ~ '^[0-9]{1,4}$'
                THEN (metadata->>'episodeNumber')::integer >= 1
              ELSE false
            END
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
              OR lower(btrim(coalesce(metadata->>'contentFormat', ''))) = 'series_episode'
              OR coalesce(btrim(metadata->>'ageGroup'), '') <> ''
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
