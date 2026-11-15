\set ON_ERROR_STOP on

DO $privileges$
BEGIN
  IF has_function_privilege('anon', 'public.admin_approve_video_generation_request(uuid,timestamptz,uuid,text,timestamptz,timestamptz,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute the video approval RPC';
  END IF;
  IF has_function_privilege('authenticated', 'public.admin_approve_video_generation_request(uuid,timestamptz,uuid,text,timestamptz,timestamptz,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute the video approval RPC';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.admin_approve_video_generation_request(uuid,timestamptz,uuid,text,timestamptz,timestamptz,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute the video approval RPC';
  END IF;
END;
$privileges$;

SET ROLE service_role;
DO $atomic_success$
DECLARE
  v_request_id uuid := '10000000-0000-4000-8000-000000000001';
  v_catalog_id uuid := '30000000-0000-4000-8000-000000000003';
  v_reviewed_at timestamptz := '2026-11-15T15:36:00Z';
  v_source_hash text := repeat('a', 64);
  v_content_hash text := repeat('b', 64);
  v_snapshot_hash text := repeat('c', 64);
  v_reviewer_id text := '50000000-0000-4000-8000-000000000005';
  v_review jsonb;
  v_approved_content jsonb;
  v_approved_metadata jsonb;
  v_result record;
BEGIN
  v_review := jsonb_build_object(
    'sourceVerified', true, 'audioReviewed', true, 'visualsReviewed', true,
    'captionsReviewed', true, 'rightsReviewed', true,
    'reviewedAt', v_reviewed_at, 'mode', 'human', 'reviewerId', v_reviewer_id
  );
  v_approved_content := jsonb_build_object(
    'audience', 'general', 'sourceHash', v_source_hash, 'contentHash', v_content_hash,
    'templateVersion', 'template-v1', 'approvalStatus', 'approved',
    'approvalReviewerId', v_reviewer_id, 'approvalReviewedAt', v_reviewed_at,
    'approvalSnapshotHash', v_snapshot_hash, 'qualityReview', v_review
  );
  v_approved_metadata := jsonb_build_object(
    'generator', 'zikr_internal_video_factory', 'videoGenerationRequestId', v_request_id::text,
    'generatedVideoUrl', 'https://res.cloudinary.com/zikr/video/upload/auto-video-1.mp4',
    'sourceHash', v_source_hash, 'contentHash', v_content_hash, 'templateVersion', 'template-v1',
    'audience', 'general', 'mediaState', 'available', 'sourceMediaMissing', false,
    'approvalStatus', 'approved', 'approvalReviewerId', v_reviewer_id,
    'approvalReviewedAt', v_reviewed_at, 'approvalSnapshotHash', v_snapshot_hash, 'qualityReview', v_review
  );

  SELECT * INTO v_result
  FROM public.admin_approve_video_generation_request(
    v_request_id, '2026-11-15T15:00:00Z', v_catalog_id,
    'zikr-10000000-0000-4000-8000-000000000001', '2026-11-15T15:00:00Z',
    v_reviewed_at, v_approved_content, v_approved_metadata
  );

  IF v_result.request_id IS DISTINCT FROM v_request_id
     OR v_result.catalog_video_id IS DISTINCT FROM v_catalog_id
     OR v_result.updated_at IS DISTINCT FROM v_reviewed_at
     OR (SELECT content->>'approvalStatus' FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM 'approved'
     OR (SELECT metadata->>'approvalStatus' FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM 'approved'
     OR (SELECT updated_at FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM v_reviewed_at
     OR (SELECT updated_at FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM v_reviewed_at THEN
    RAISE EXCEPTION 'request and catalog approval did not commit together';
  END IF;
END;
$atomic_success$;
RESET ROLE;

SET ROLE service_role;
DO $atomic_kids_legacy_success$
DECLARE
  v_request_id uuid := '50000000-0000-4000-8000-000000000005';
  v_catalog_id uuid := '70000000-0000-4000-8000-000000000007';
  v_reviewed_at timestamptz := '2026-11-15T16:00:00Z';
  v_source_hash text := repeat('1', 64);
  v_content_hash text := repeat('2', 64);
  v_qa_snapshot_hash text := repeat('3', 64);
  v_approval_hash text := repeat('9', 64);
  v_reviewer_id text := '90000000-0000-4000-8000-000000000009';
  v_review jsonb;
  v_approved_content jsonb;
  v_approved_metadata jsonb;
  v_result record;
BEGIN
  v_review := jsonb_build_object(
    'sourceVerified', true, 'audioReviewed', true, 'visualsReviewed', true,
    'captionsReviewed', true, 'rightsReviewed', true,
    'reviewedAt', v_reviewed_at, 'mode', 'human', 'reviewerId', v_reviewer_id
  );
  v_approved_content := jsonb_build_object(
    'audience', 'kids', 'sourceHash', v_source_hash, 'contentHash', v_content_hash,
    'templateVersion', 'kids-template-v1', 'approvalStatus', 'approved',
    'approvalReviewerId', v_reviewer_id, 'approvalReviewedAt', v_reviewed_at,
    'approvalSnapshotHash', v_approval_hash, 'qualityReview', v_review,
    'kidsVideoQaStatus', 'passed',
    'automatedVideoQa', jsonb_build_object('status', 'passed', 'snapshotHash', v_qa_snapshot_hash),
    'contentFormat', 'series_episode', 'aiMode', 'original_kids_story', 'sourceType', 'original_kids_fiction',
    'seriesId', 'series-1', 'seriesTitle', 'قصص القيم', 'learningObjective', 'تعلم الصدق والأمانة',
    'seasonNumber', 1, 'episodeNumber', 2
  );
  v_approved_metadata := jsonb_build_object(
    'generator', 'zikr_internal_video_factory', 'videoGenerationRequestId', v_request_id::text,
    'generatedVideoUrl', 'https://res.cloudinary.com/zikr/video/upload/kids-video-1.mp4',
    'sourceHash', v_source_hash, 'contentHash', v_content_hash, 'templateVersion', 'kids-template-v1',
    'audience', 'kids', 'mediaState', 'available', 'sourceMediaMissing', false,
    'kidsVideoQaStatus', 'passed',
    'automatedVideoQa', jsonb_build_object('status', 'passed', 'snapshotHash', v_qa_snapshot_hash),
    'contentFormat', 'series_episode', 'aiMode', 'original_kids_story', 'sourceType', 'original_kids_fiction',
    'seriesId', 'series-1', 'seriesTitle', 'قصص القيم', 'learningObjective', 'تعلم الصدق والأمانة',
    'seasonNumber', 1, 'episodeNumber', 2,
    'approvalStatus', 'approved', 'approvalReviewerId', v_reviewer_id,
    'approvalReviewedAt', v_reviewed_at, 'approvalSnapshotHash', v_approval_hash, 'qualityReview', v_review
  );
  SELECT * INTO v_result
  FROM public.admin_approve_video_generation_request(
    v_request_id, '2026-11-15T15:00:00Z', v_catalog_id,
    'zikr-50000000-0000-4000-8000-000000000005', '2026-11-15T15:00:00Z',
    v_reviewed_at, v_approved_content, v_approved_metadata
  );
  IF v_result.request_id IS DISTINCT FROM v_request_id
     OR v_result.catalog_video_id IS DISTINCT FROM v_catalog_id
     OR v_result.updated_at IS DISTINCT FROM v_reviewed_at
     OR (SELECT content->>'kidsVideoQaStatus' FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM 'passed'
     OR (SELECT content->>'approvalStatus' FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM 'approved'
     OR (SELECT metadata->>'kidsVideoQaStatus' FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM 'passed'
     OR (SELECT metadata->>'seriesId' FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM 'series-1'
     OR (SELECT metadata->>'approvalStatus' FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'legacy Kids QA reconciliation did not atomically update request and catalog';
  END IF;
END;
$atomic_kids_legacy_success$;
RESET ROLE;

CREATE OR REPLACE FUNCTION public.reject_video_catalog_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.slug = 'reject-catalog' AND NEW.metadata->>'approvalStatus' = 'approved' THEN
    RAISE EXCEPTION 'forced catalog approval failure';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER reject_video_catalog_approval
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.reject_video_catalog_approval();

SET ROLE service_role;
DO $atomic_rollback$
DECLARE
  v_request_id uuid := '20000000-0000-4000-8000-000000000002';
  v_catalog_id uuid := '40000000-0000-4000-8000-000000000004';
  v_reviewed_at timestamptz := '2026-11-15T15:36:00Z';
  v_source_hash text := repeat('d', 64);
  v_content_hash text := repeat('e', 64);
  v_snapshot_hash text := repeat('f', 64);
  v_reviewer_id text := '60000000-0000-4000-8000-000000000006';
  v_review jsonb;
  v_approved_content jsonb;
  v_approved_metadata jsonb;
  v_failed boolean := false;
BEGIN
  v_review := jsonb_build_object(
    'sourceVerified', true, 'audioReviewed', true, 'visualsReviewed', true,
    'captionsReviewed', true, 'rightsReviewed', true,
    'reviewedAt', v_reviewed_at, 'mode', 'human', 'reviewerId', v_reviewer_id
  );
  v_approved_content := jsonb_build_object(
    'audience', 'general', 'sourceHash', v_source_hash, 'contentHash', v_content_hash,
    'templateVersion', 'template-v1', 'approvalStatus', 'approved',
    'approvalReviewerId', v_reviewer_id, 'approvalReviewedAt', v_reviewed_at,
    'approvalSnapshotHash', v_snapshot_hash, 'qualityReview', v_review
  );
  v_approved_metadata := jsonb_build_object(
    'generator', 'zikr_internal_video_factory', 'videoGenerationRequestId', v_request_id::text,
    'generatedVideoUrl', 'https://res.cloudinary.com/zikr/video/upload/auto-video-2.mp4',
    'sourceHash', v_source_hash, 'contentHash', v_content_hash, 'templateVersion', 'template-v1',
    'audience', 'general', 'mediaState', 'available', 'sourceMediaMissing', false,
    'approvalStatus', 'approved', 'approvalReviewerId', v_reviewer_id,
    'approvalReviewedAt', v_reviewed_at, 'approvalSnapshotHash', v_snapshot_hash, 'qualityReview', v_review
  );

  BEGIN
    PERFORM 1 FROM public.admin_approve_video_generation_request(
      v_request_id, '2026-11-15T15:00:00Z', v_catalog_id,
      'reject-catalog', '2026-11-15T15:00:00Z',
      v_reviewed_at, v_approved_content, v_approved_metadata
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'forced catalog approval failure' THEN RAISE; END IF;
    v_failed := true;
  END;

  IF NOT v_failed THEN RAISE EXCEPTION 'expected the simulated catalog update failure'; END IF;

  IF (SELECT content->>'approvalStatus' FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM 'awaiting_human_review'
     OR (SELECT updated_at FROM public.video_generation_requests WHERE id = v_request_id) IS DISTINCT FROM '2026-11-15T15:00:00Z'::timestamptz
     OR (SELECT metadata->>'approvalStatus' FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM 'awaiting_human_review'
     OR (SELECT updated_at FROM public.videos WHERE id = v_catalog_id) IS DISTINCT FROM '2026-11-15T15:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'failed catalog update left a partial video approval mutation';
  END IF;
END;
$atomic_rollback$;
RESET ROLE;

SELECT 'VIDEO_APPROVAL_ATOMIC_INTEGRATION_PASSED' AS result;
