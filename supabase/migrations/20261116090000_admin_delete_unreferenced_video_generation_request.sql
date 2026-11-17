-- Allow admins to remove an individual terminal generation request only when
-- it has no media/provider identifiers and no catalog or social queue references.
-- A shared transaction advisory lock serializes deletion with every new reference.
CREATE OR REPLACE FUNCTION public.guard_video_generation_request_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  request_id_text text;
  request_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'videos' THEN
    IF NOT (NEW.metadata ? 'videoGenerationRequestId') THEN
      RETURN NEW;
    END IF;
    request_id_text := NULLIF(BTRIM(NEW.metadata ->> 'videoGenerationRequestId'), '');
  ELSE
    IF NOT (
      LOWER(BTRIM(NEW.content_type)) = 'video'
      OR LOWER(BTRIM(NEW.content_type)) = 'video_generation'
      OR RIGHT(LOWER(BTRIM(NEW.content_type)), 6) = '_video'
    ) THEN
      RETURN NEW;
    END IF;
    request_id_text := NULLIF(BTRIM(NEW.content_id), '');
  END IF;

  IF request_id_text IS NULL THEN
    RAISE EXCEPTION 'VIDEO_REFERENCE_REQUEST_ID_REQUIRED'
      USING ERRCODE = '23503';
  END IF;

  BEGIN
    request_id := request_id_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'VIDEO_REFERENCE_REQUEST_ID_INVALID'
      USING ERRCODE = '23503';
  END;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(request_id::text, 741953)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.video_generation_requests AS request
    WHERE request.id = request_id
  ) THEN
    RAISE EXCEPTION 'VIDEO_REFERENCE_REQUEST_NOT_FOUND'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_video_generation_request_reference()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_video_generation_request_reference ON public.videos;
CREATE TRIGGER guard_video_generation_request_reference
  BEFORE INSERT OR UPDATE OF metadata ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_video_generation_request_reference();

DROP TRIGGER IF EXISTS guard_social_queue_video_generation_request_reference
  ON public.social_publish_queue;
CREATE TRIGGER guard_social_queue_video_generation_request_reference
  BEFORE INSERT OR UPDATE OF content_type, content_id ON public.social_publish_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_video_generation_request_reference();

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
  -- Must use the same key as both reference triggers. Whichever transaction
  -- obtains it first either commits the reference (so deletion sees it) or
  -- deletes the request (so a later reference is rejected by its trigger).
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

  IF request_row.status NOT IN ('failed', 'cancelled') THEN
    RAISE EXCEPTION 'VIDEO_REQUEST_DELETE_NOT_TERMINAL' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(BTRIM(request_row.video_url), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.youtube_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.facebook_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.heygen_video_id), '') IS NOT NULL
     OR NULLIF(BTRIM(request_row.provider_job_id), '') IS NOT NULL THEN
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
    AND request.status IN ('failed', 'cancelled')
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
