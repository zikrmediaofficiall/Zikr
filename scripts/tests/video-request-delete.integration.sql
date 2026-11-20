\set ON_ERROR_STOP on

INSERT INTO public.video_generation_requests (id, updated_at, status)
VALUES ('10000000-0000-4000-8000-000000000001', '2026-11-01T00:00:00Z', 'failed');
INSERT INTO public.video_generation_requests (id, updated_at, status)
VALUES ('10000000-0000-4000-8000-000000000002', '2026-11-01T00:00:00Z', 'completed');
INSERT INTO public.video_generation_requests (id, updated_at, status, video_url)
VALUES ('10000000-0000-4000-8000-000000000003', '2026-11-01T00:00:00Z', 'failed', 'https://media.example/video.mp4');
INSERT INTO public.video_generation_requests (id, updated_at, status)
VALUES ('10000000-0000-4000-8000-000000000004', '2026-11-01T00:00:00Z', 'cancelled');
INSERT INTO public.videos (id, metadata)
VALUES ('20000000-0000-4000-8000-000000000001', '{"videoGenerationRequestId":"10000000-0000-4000-8000-000000000004"}');
INSERT INTO public.video_generation_requests (id, updated_at, status)
VALUES ('10000000-0000-4000-8000-000000000005', '2026-11-01T00:00:00Z', 'failed');
INSERT INTO public.social_publish_queue (content_id)
VALUES ('10000000-0000-4000-8000-000000000005');
INSERT INTO public.video_generation_requests (id, updated_at, status)
VALUES ('10000000-0000-4000-8000-000000000006', '2026-11-01T00:00:00Z', 'failed');
INSERT INTO public.video_generation_requests (id, updated_at, status, content)
VALUES (
  '10000000-0000-4000-8000-000000000007',
  '2026-11-01T00:00:00Z',
  'failed',
  '{"audioSource":"human_recording","audioUrl":"https://res.cloudinary.com/zikr-media/video/upload/audio-human-123e4567-e89b-42d3-a456-426614174000.mp3","audioMediaAssetId":"22222222-2222-4222-8222-222222222222"}'::jsonb
);
INSERT INTO public.video_generation_requests (id, updated_at, status, thumbnail_url)
VALUES (
  '10000000-0000-4000-8000-000000000008',
  '2026-11-01T00:00:00Z',
  'failed',
  'https://media.example/retained-thumbnail.jpg'
);

-- Only service_role can execute this privileged RPC.
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000001', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'anon unexpectedly executed the privileged delete RPC';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- A failed, unreferenced request can be removed atomically.
SET ROLE service_role;
DO $$
DECLARE deleted uuid;
BEGIN
  SELECT deleted_id INTO deleted
  FROM public.admin_delete_unreferenced_video_generation_request(
    '10000000-0000-4000-8000-000000000001', '2026-11-01T00:00:00Z'
  );
  IF deleted IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'safe failed request was not deleted';
  END IF;
END;
$$;

-- A stale version is rejected.
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000006', '2026-11-02T00:00:00Z'
    );
    RAISE EXCEPTION 'stale request version unexpectedly deleted';
  EXCEPTION WHEN SQLSTATE '40001' THEN
    NULL;
  END;
END;
$$;

-- Completed or cancelled records with any published media/catalog/queue linkage are preserved.
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000002', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'completed request unexpectedly deleted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000003', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'request with video URL unexpectedly deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000004', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'catalog-linked request unexpectedly deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000005', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'social-queue-linked request unexpectedly deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000007', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'request with embedded narration asset reference unexpectedly deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_delete_unreferenced_video_generation_request(
      '10000000-0000-4000-8000-000000000008', '2026-11-01T00:00:00Z'
    );
    RAISE EXCEPTION 'request with thumbnail URL unexpectedly deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

DO $$
DECLARE remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM public.video_generation_requests
  WHERE id IN (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000008'
  );
  IF remaining <> 7 THEN
    RAISE EXCEPTION 'expected exactly one safe request deletion; found % remaining', remaining;
  END IF;
END;
$$;

SELECT 'VIDEO_REQUEST_SAFE_DELETE_INTEGRATION_PASSED' AS result;
