DO $roles$
BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$roles$;

DO $roles$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$roles$;

DO $roles$
BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$roles$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE TABLE public.videos (
  id text PRIMARY KEY,
  published boolean NOT NULL DEFAULT false,
  metadata jsonb
);

CREATE TABLE public.video_generation_requests (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  category text NOT NULL,
  video_url text,
  source_hash text,
  content_hash text,
  template_version text,
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generation_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_generation_requests TO service_role;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Reproduce the legacy production policy: every published row is readable.
CREATE POLICY videos_public_read
  ON public.videos
  FOR SELECT
  TO public
  USING (published IS TRUE);

GRANT SELECT ON public.videos TO anon, authenticated, service_role;

INSERT INTO public.videos (id, published, metadata)
VALUES
  ('legacy-sql-null-metadata', true, NULL),
  ('legacy-no-audience', true, '{}'::jsonb),
  ('explicit-general', true, '{"audience":"general"}'::jsonb),
  ('kids-approved', true, '{
    "audience":"kids",
    "generator":"zikr_internal_video_factory",
    "videoGenerationRequestId":"10000000-0000-4000-8000-000000000001",
    "generatedVideoUrl":"https://res.cloudinary.com/zikr/video/upload/v123/kids-approved.mp4",
    "mediaState":"cloudinary_master",
    "sourceMediaMissing":false,
    "sourceHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "contentHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "templateVersion":"kids-template-v1",
    "contentFormat":"series_episode",
    "aiMode":"original_kids_story",
    "sourceType":"original_kids_fiction",
    "seriesId":"approval-fixture-series",
    "seriesTitle":"Approval Fixture Series",
    "learningObjective":"Practice kindness",
    "seasonNumber":1,
    "episodeNumber":1,
    "kidsVideoQaStatus":"passed",
    "automatedVideoQa":{"status":"passed","snapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    "approvalStatus":"approved",
    "approvalReviewerId":"11111111-1111-4111-8111-111111111111",
    "approvalReviewedAt":"2026-11-15T12:00:00.000Z",
    "approvalSnapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "qualityReview":{
      "mode":"human",
      "reviewerId":"11111111-1111-4111-8111-111111111111",
      "reviewedAt":"2026-11-15T12:00:00.000Z",
      "sourceVerified":true,
      "audioReviewed":true,
      "visualsReviewed":true,
      "captionsReviewed":true,
      "rightsReviewed":true
    }
  }'::jsonb),
  ('kids-automated-only', true, '{"audience":"kids","generator":"zikr_internal_video_factory","videoGenerationRequestId":"10000000-0000-4000-8000-000000000002","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed","snapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}'::jsonb),
  ('kids-system-approved', true, '{
    "audience":"kids","generator":"zikr_internal_video_factory","videoGenerationRequestId":"10000000-0000-4000-8000-000000000003",
    "kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed","snapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    "approvalStatus":"approved","approvalReviewerId":"system:zikr-video-factory",
    "approvalReviewedAt":"2026-11-15T12:00:00.000Z","approvalSnapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "qualityReview":{"mode":"automated","reviewerId":"system:zikr-video-factory","reviewedAt":"2026-11-15T12:00:00.000Z","sourceVerified":true,"audioReviewed":true,"visualsReviewed":true,"captionsReviewed":true,"rightsReviewed":true}
  }'::jsonb),
  ('kids-incomplete-human-review', true, '{
    "audience":"kids","generator":"zikr_internal_video_factory","videoGenerationRequestId":"10000000-0000-4000-8000-000000000004",
    "kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed","snapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    "approvalStatus":"approved","approvalReviewerId":"22222222-2222-4222-8222-222222222222",
    "approvalReviewedAt":"2026-11-15T12:00:00.000Z","approvalSnapshotHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "qualityReview":{"mode":"human","reviewerId":"22222222-2222-4222-8222-222222222222","reviewedAt":"2026-11-15T12:00:00.000Z","sourceVerified":true,"audioReviewed":true,"visualsReviewed":true,"captionsReviewed":true,"rightsReviewed":false}
  }'::jsonb),
  ('internal-missing-audience', true, '{"generator":"zikr_internal_video_factory","videoGenerationRequestId":"10000000-0000-4000-8000-000000000099"}'::jsonb),
  ('kids-failed-qa', true, '{"audience":"kids","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"failed"}}'::jsonb),
  ('kids-missing-generator', true, '{"audience":"kids","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
  ('unknown-child-audience', true, '{"audience":"child","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
  ('unknown-children-audience', true, '{"audience":"children","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
  ('mixed-case-kids-audience', true, '{"audience":"Kids","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
  ('spaced-kids-audience', true, '{"audience":" kids ","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
  ('empty-audience', true, '{"audience":""}'::jsonb),
  ('malformed-array-metadata', true, '["kids"]'::jsonb),
  ('json-null-metadata', true, 'null'::jsonb),
  ('unpublished-general', false, '{"audience":"general"}'::jsonb);

-- These catalog rows have complete-looking human approval metadata but must
-- remain private unless the linked generation request exists and matches.
INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-orphan-human-approved', published,
       metadata || jsonb_build_object('videoGenerationRequestId', '10000000-0000-4000-8000-000000000002')
FROM public.videos WHERE id = 'kids-approved';

INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-request-mismatched-approval', published,
       metadata || jsonb_build_object('videoGenerationRequestId', '10000000-0000-4000-8000-000000000003')
FROM public.videos WHERE id = 'kids-approved';

INSERT INTO public.video_generation_requests (
  id, status, category, video_url, source_hash, content_hash, template_version, content
)
SELECT
  (metadata->>'videoGenerationRequestId')::uuid,
  'completed',
  'story',
  metadata->>'generatedVideoUrl',
  metadata->>'sourceHash',
  metadata->>'contentHash',
  metadata->>'templateVersion',
  metadata - 'generatedVideoUrl'
FROM public.videos
WHERE id = 'kids-approved';

INSERT INTO public.video_generation_requests (
  id, status, category, video_url, source_hash, content_hash, template_version, content
)
SELECT
  '10000000-0000-4000-8000-000000000003'::uuid,
  'completed',
  'story',
  metadata->>'generatedVideoUrl',
  metadata->>'sourceHash',
  metadata->>'contentHash',
  metadata->>'templateVersion',
  (metadata - 'generatedVideoUrl') || jsonb_build_object(
    'videoGenerationRequestId', '10000000-0000-4000-8000-000000000003',
    'approvalSnapshotHash', repeat('b', 64)
  )
FROM public.videos
WHERE id = 'kids-approved';

-- These four rows otherwise copy the fully approved fixture. They must remain
-- private because request/reviewer IDs with a non-RFC version or variant are
-- not valid application-generated UUIDs.
INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-invalid-request-version', published,
       metadata || jsonb_build_object('videoGenerationRequestId', '10000000-0000-0000-8000-000000000001')
FROM public.videos WHERE id = 'kids-approved';

INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-invalid-request-variant', published,
       metadata || jsonb_build_object('videoGenerationRequestId', '10000000-0000-4000-7000-000000000001')
FROM public.videos WHERE id = 'kids-approved';

INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-invalid-reviewer-version', published,
       metadata || jsonb_build_object(
         'approvalReviewerId', '11111111-1111-0111-8111-111111111111',
         'qualityReview', metadata->'qualityReview' || jsonb_build_object('reviewerId', '11111111-1111-0111-8111-111111111111')
       )
FROM public.videos WHERE id = 'kids-approved';

INSERT INTO public.videos (id, published, metadata)
SELECT 'kids-invalid-reviewer-variant', published,
       metadata || jsonb_build_object(
         'approvalReviewerId', '11111111-1111-4111-7111-111111111111',
         'qualityReview', metadata->'qualityReview' || jsonb_build_object('reviewerId', '11111111-1111-4111-7111-111111111111')
       )
FROM public.videos WHERE id = 'kids-approved';


-- Conflicting Kids provenance must not become public merely because a legacy
-- or malformed catalog row claims audience=general (or omits audience).
INSERT INTO public.videos (id, published, metadata)
VALUES
  ('general-kids-category', true, '{"audience":"general","category":"kids_story"}'::jsonb),
  ('general-kids-source-type', true, '{"audience":"general","sourceType":"original_kids_fiction"}'::jsonb),
  ('general-kids-ai-mode', true, '{"audience":"general","aiMode":"original_kids_story"}'::jsonb),
  ('general-kids-type', true, '{"audience":"general","type":"kids_story"}'::jsonb),
  ('general-kids-content-type', true, '{"audience":"general","contentType":"kids_video"}'::jsonb),
  ('general-kids-content-format', true, '{"audience":"general","contentFormat":"series_episode"}'::jsonb),
  ('general-kids-age-group', true, '{"audience":"general","ageGroup":"6-8"}'::jsonb),
  ('general-kids-generation-mode', true, '{"audience":"general","generationMode":"free_deterministic_story_factory"}'::jsonb),
  ('general-kids-source-id', true, '{"audience":"general","sourceId":"kids-series:little-good-steps:s1:e1"}'::jsonb),
  ('general-kids-curated-source-id', true, '{"audience":"general","curatedSourceId":"kids-series:little-good-steps:s1:e1"}'::jsonb),
  ('general-kids-public-path', true, '{"audience":"general","publicPath":"/kids/videos/episode-1"}'::jsonb),
  ('general-kids-public-path-traversal', true, '{"audience":"general","publicPath":"/public/../kids/videos/episode-1"}'::jsonb),
  ('legacy-kids-story-shape', true, '{"sourceType":"story","type":"story"}'::jsonb),
  ('legacy-encoded-kids-path', true, '{"publicPath":"/%256Bids/story"}'::jsonb),
  ('legacy-backslash-kids-path', true, '{"publicPath":"\\\\kids\\\\story"}'::jsonb),
  ('legacy-kids-public-path-alias', true, '{"public_path":"/kids/story"}'::jsonb);
