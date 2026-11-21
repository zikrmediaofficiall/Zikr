-- Extend the reference-checked video request deletion RPC to allow removal of
-- completed renders that are explicitly awaiting human review. Published or
-- already-approved video requests remain ineligible.
CREATE OR REPLACE FUNCTION public.admin_delete_unreferenced_video_generation_request(
  p_request_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS TABLE(deleted_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  request_row public.video_generation_requests%ROWTYPE;
BEGIN
  -- Serialize deletion with the catalog/social reference-insert triggers.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text, 741953)
  );

  SELECT *
  INTO request_row
  FROM public.video_generation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF request_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_CONFLICT' USING ERRCODE = '40001';
  END IF;

  IF request_row.status NOT IN ('failed', 'cancelled', 'completed')
     OR (
       request_row.status = 'completed'
       AND request_row.content ->> 'approvalStatus'
         NOT IN ('qa_failed', 'awaiting_human_review')
     ) THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_NOT_TERMINAL' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(BTRIM(request_row.video_url), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.thumbnail_url), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.youtube_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.facebook_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.heygen_video_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.provider_job_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'audioUrl'), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'humanAudioUrl'), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'audioMediaAssetId'), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'audioMediaAssetOwnerId'), '') IS NOT NULL
     OR request_row.content ->> 'audioSource' = 'human_recording'
     OR NULLIF(BTRIM(request_row.content ->> 'videoUrl'), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'generatedVideoUrl'), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.content ->> 'thumbnailUrl'), '') IS NOT NULL THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_HAS_MEDIA' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.videos AS video
    WHERE video.metadata ->> 'videoGenerationRequestId' = p_request_id::text
  ) THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_REFERENCED_BY_CATALOG' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.social_publish_queue AS queue_item
    WHERE queue_item.content_id = p_request_id::text
      AND (
        LOWER(BTRIM(queue_item.content_type)) = 'video'
        OR LOWER(BTRIM(queue_item.content_type)) = 'video_generation'
        OR RIGHT(LOWER(BTRIM(queue_item.content_type)), 6) = '_video'
      )
  ) THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_REFERENCED_BY_SOCIAL_QUEUE' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.video_generation_requests AS request
  WHERE request.id = p_request_id
    AND request.updated_at = p_expected_updated_at
    AND (
      request.status IN ('failed', 'cancelled')
      OR (
        request.status = 'completed'
        AND request.content ->> 'approvalStatus'
          IN ('qa_failed', 'awaiting_human_review')
      )
    )
  RETURNING request.id INTO deleted_id;

  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_CONFLICT' USING ERRCODE = '40001';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_unreferenced_video_generation_request(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_unreferenced_video_generation_request(uuid, timestamptz)
  TO service_role;
