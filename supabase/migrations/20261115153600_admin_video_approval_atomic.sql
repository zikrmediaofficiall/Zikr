BEGIN;

CREATE OR REPLACE FUNCTION public.admin_approve_video_generation_request(
  p_request_id uuid,
  p_expected_request_updated_at timestamptz,
  p_catalog_video_id uuid,
  p_catalog_slug text,
  p_expected_catalog_updated_at timestamptz,
  p_reviewed_at timestamptz,
  p_approved_content jsonb,
  p_catalog_metadata jsonb
)
RETURNS TABLE (request_id uuid, catalog_video_id uuid, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_request public.video_generation_requests%ROWTYPE;
  v_catalog public.videos%ROWTYPE;
  v_approval_fields text[] := ARRAY[
    'approvalStatus', 'approvalReviewerId', 'approvalReviewedAt', 'approvalSnapshotHash', 'qualityReview'
  ];
  v_check text;
  v_request_rows integer;
  v_catalog_rows integer;
BEGIN
  IF p_request_id IS NULL
     OR p_expected_request_updated_at IS NULL
     OR p_catalog_video_id IS NULL
     OR nullif(btrim(p_catalog_slug), '') IS NULL
     OR p_expected_catalog_updated_at IS NULL
     OR p_reviewed_at IS NULL
     OR jsonb_typeof(p_approved_content) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_catalog_metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_INVALID: required approval fields are missing'
      USING ERRCODE = '22023';
  END IF;

  IF p_approved_content->>'approvalStatus' IS DISTINCT FROM 'approved'
     OR p_catalog_metadata->>'approvalStatus' IS DISTINCT FROM 'approved'
     OR p_approved_content->>'approvalReviewerId' IS NULL
     OR btrim(p_approved_content->>'approvalReviewerId') = ''
     OR p_approved_content->>'approvalReviewerId' = 'system:zikr-video-factory'
     OR p_approved_content->>'approvalReviewerId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR p_catalog_metadata->>'approvalReviewerId' IS DISTINCT FROM p_approved_content->>'approvalReviewerId'
     OR p_approved_content->>'approvalSnapshotHash' IS NULL
     OR p_approved_content->>'approvalSnapshotHash' !~ '^[a-f0-9]{64}$'
     OR p_catalog_metadata->>'approvalSnapshotHash' IS DISTINCT FROM p_approved_content->>'approvalSnapshotHash'
     OR p_approved_content->>'approvalReviewedAt' IS NULL
     OR p_catalog_metadata->>'approvalReviewedAt' IS DISTINCT FROM p_approved_content->>'approvalReviewedAt'
     OR (p_approved_content->>'approvalReviewedAt')::timestamptz IS DISTINCT FROM p_reviewed_at
     OR (p_catalog_metadata->>'approvalReviewedAt')::timestamptz IS DISTINCT FROM p_reviewed_at
     OR jsonb_typeof(p_approved_content->'qualityReview') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_catalog_metadata->'qualityReview') IS DISTINCT FROM 'object'
     OR p_approved_content->'qualityReview'->>'mode' IS DISTINCT FROM 'human'
     OR p_catalog_metadata->'qualityReview'->>'mode' IS DISTINCT FROM 'human'
     OR p_approved_content->'qualityReview'->>'reviewerId' IS DISTINCT FROM p_approved_content->>'approvalReviewerId'
     OR p_catalog_metadata->'qualityReview'->>'reviewerId' IS DISTINCT FROM p_approved_content->>'approvalReviewerId'
     OR (p_approved_content->'qualityReview'->>'reviewedAt')::timestamptz IS DISTINCT FROM p_reviewed_at
     OR (p_catalog_metadata->'qualityReview'->>'reviewedAt')::timestamptz IS DISTINCT FROM p_reviewed_at THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_INVALID: approval snapshot or human review metadata is inconsistent'
      USING ERRCODE = '22023';
  END IF;

  FOREACH v_check IN ARRAY ARRAY[
    'sourceVerified', 'audioReviewed', 'visualsReviewed', 'captionsReviewed', 'rightsReviewed'
  ] LOOP
    IF p_approved_content->'qualityReview'->>v_check IS DISTINCT FROM 'true'
       OR p_catalog_metadata->'qualityReview'->>v_check IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'VIDEO_APPROVAL_INVALID: required human review check % is not true', v_check
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT * INTO v_request
  FROM public.video_generation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: video generation request no longer exists'
      USING ERRCODE = '40001';
  END IF;

  IF v_request.status IS DISTINCT FROM 'completed'
     OR v_request.updated_at IS DISTINCT FROM p_expected_request_updated_at THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: video generation request changed during review'
      USING ERRCODE = '40001';
  END IF;

  IF v_request.video_url IS NULL
     OR v_request.source_hash IS NULL
     OR v_request.content_hash IS NULL
     OR v_request.template_version IS NULL
     OR p_approved_content->>'sourceHash' IS DISTINCT FROM v_request.source_hash
     OR p_approved_content->>'contentHash' IS DISTINCT FROM v_request.content_hash
     OR p_approved_content->>'templateVersion' IS DISTINCT FROM v_request.template_version
     OR p_catalog_metadata->>'generatedVideoUrl' IS DISTINCT FROM v_request.video_url
     OR p_catalog_metadata->>'sourceHash' IS DISTINCT FROM v_request.source_hash
     OR p_catalog_metadata->>'contentHash' IS DISTINCT FROM v_request.content_hash
     OR p_catalog_metadata->>'templateVersion' IS DISTINCT FROM v_request.template_version
     OR p_catalog_metadata->>'videoGenerationRequestId' IS DISTINCT FROM p_request_id::text
     OR p_catalog_metadata->>'generator' IS DISTINCT FROM 'zikr_internal_video_factory' THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: request and catalog media fingerprints do not match'
      USING ERRCODE = '40001';
  END IF;

  IF (p_approved_content - v_approval_fields)
     IS DISTINCT FROM (coalesce(v_request.content, '{}'::jsonb) - v_approval_fields) THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_INVALID: request content changed outside the approval fields'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_catalog
  FROM public.videos
  WHERE id = p_catalog_video_id
    AND slug = p_catalog_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: internal video catalog row no longer exists'
      USING ERRCODE = '40001';
  END IF;

  IF v_catalog.updated_at IS DISTINCT FROM p_expected_catalog_updated_at THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: internal video catalog row changed during review'
      USING ERRCODE = '40001';
  END IF;

  IF jsonb_typeof(v_catalog.metadata) IS DISTINCT FROM 'object'
     OR v_catalog.metadata->>'generator' IS DISTINCT FROM 'zikr_internal_video_factory'
     OR v_catalog.metadata->>'videoGenerationRequestId' IS DISTINCT FROM p_request_id::text
     OR v_catalog.metadata->>'generatedVideoUrl' IS DISTINCT FROM v_request.video_url
     OR v_catalog.metadata->>'sourceHash' IS DISTINCT FROM v_request.source_hash
     OR v_catalog.metadata->>'contentHash' IS DISTINCT FROM v_request.content_hash
     OR v_catalog.metadata->>'templateVersion' IS DISTINCT FROM v_request.template_version
     OR (v_catalog.metadata->>'audience' IS NOT NULL
         AND v_catalog.metadata->>'audience' IS DISTINCT FROM p_approved_content->>'audience')
     OR v_catalog.metadata->>'mediaState' IN ('purged', 'unlinked')
     OR v_catalog.metadata->>'sourceMediaMissing' = 'true' THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: catalog media is no longer eligible for approval'
      USING ERRCODE = '40001';
  END IF;

  IF (p_catalog_metadata - v_approval_fields)
     IS DISTINCT FROM (v_catalog.metadata - v_approval_fields) THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_INVALID: catalog metadata changed outside the approval fields'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.video_generation_requests
  SET content = p_approved_content, updated_at = p_reviewed_at
  WHERE id = p_request_id
    AND status = 'completed'
    AND updated_at = p_expected_request_updated_at;

  GET DIAGNOSTICS v_request_rows = ROW_COUNT;
  IF v_request_rows <> 1 THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: request compare-and-set failed'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.videos
  SET metadata = p_catalog_metadata, updated_at = p_reviewed_at
  WHERE id = p_catalog_video_id
    AND slug = p_catalog_slug
    AND updated_at = p_expected_catalog_updated_at
    AND metadata->>'videoGenerationRequestId' = p_request_id::text;

  GET DIAGNOSTICS v_catalog_rows = ROW_COUNT;
  IF v_catalog_rows <> 1 THEN
    RAISE EXCEPTION 'VIDEO_APPROVAL_CONFLICT: catalog compare-and-set failed'
      USING ERRCODE = '40001';
  END IF;

  RETURN QUERY SELECT p_request_id, p_catalog_video_id, p_reviewed_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_approve_video_generation_request(
  uuid, timestamptz, uuid, text, timestamptz, timestamptz, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_approve_video_generation_request(
  uuid, timestamptz, uuid, text, timestamptz, timestamptz, jsonb, jsonb
) TO service_role;

COMMENT ON FUNCTION public.admin_approve_video_generation_request(
  uuid, timestamptz, uuid, text, timestamptz, timestamptz, jsonb, jsonb
) IS
  'Atomically records a human approval on a completed video-generation request and its matching internal catalog row. Both compare-and-set updates roll back together on any conflict.';

COMMIT;
