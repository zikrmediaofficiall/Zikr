CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE public.video_generation_requests (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  video_url text,
  source_hash text,
  content_hash text,
  template_version text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL
);

CREATE TABLE public.videos (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL
);

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, UPDATE ON public.video_generation_requests TO service_role;
GRANT SELECT, UPDATE ON public.videos TO service_role;

INSERT INTO public.video_generation_requests (
  id, status, video_url, source_hash, content_hash, template_version, content, updated_at
) VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'completed',
    'https://res.cloudinary.com/zikr/video/upload/auto-video-1.mp4',
    repeat('a', 64), repeat('b', 64), 'template-v1',
    jsonb_build_object(
      'audience', 'general', 'sourceHash', repeat('a', 64), 'contentHash', repeat('b', 64),
      'templateVersion', 'template-v1', 'approvalStatus', 'awaiting_human_review',
      'approvalReviewerId', null, 'approvalReviewedAt', null, 'approvalSnapshotHash', null, 'qualityReview', null
    ),
    '2026-11-15T15:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'completed',
    'https://res.cloudinary.com/zikr/video/upload/auto-video-2.mp4',
    repeat('d', 64), repeat('e', 64), 'template-v1',
    jsonb_build_object(
      'audience', 'general', 'sourceHash', repeat('d', 64), 'contentHash', repeat('e', 64),
      'templateVersion', 'template-v1', 'approvalStatus', 'awaiting_human_review',
      'approvalReviewerId', null, 'approvalReviewedAt', null, 'approvalSnapshotHash', null, 'qualityReview', null
    ),
    '2026-11-15T15:00:00Z'
  );

INSERT INTO public.videos (id, slug, metadata, updated_at) VALUES
  (
    '30000000-0000-4000-8000-000000000003',
    'zikr-10000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'generator', 'zikr_internal_video_factory',
      'videoGenerationRequestId', '10000000-0000-4000-8000-000000000001',
      'generatedVideoUrl', 'https://res.cloudinary.com/zikr/video/upload/auto-video-1.mp4',
      'sourceHash', repeat('a', 64), 'contentHash', repeat('b', 64), 'templateVersion', 'template-v1',
      'audience', 'general', 'mediaState', 'available', 'sourceMediaMissing', false,
      'approvalStatus', 'awaiting_human_review', 'approvalReviewerId', null,
      'approvalReviewedAt', null, 'approvalSnapshotHash', null, 'qualityReview', null
    ),
    '2026-11-15T15:00:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    'reject-catalog',
    jsonb_build_object(
      'generator', 'zikr_internal_video_factory',
      'videoGenerationRequestId', '20000000-0000-4000-8000-000000000002',
      'generatedVideoUrl', 'https://res.cloudinary.com/zikr/video/upload/auto-video-2.mp4',
      'sourceHash', repeat('d', 64), 'contentHash', repeat('e', 64), 'templateVersion', 'template-v1',
      'audience', 'general', 'mediaState', 'available', 'sourceMediaMissing', false,
      'approvalStatus', 'awaiting_human_review', 'approvalReviewerId', null,
      'approvalReviewedAt', null, 'approvalSnapshotHash', null, 'qualityReview', null
    ),
    '2026-11-15T15:00:00Z'
  );
