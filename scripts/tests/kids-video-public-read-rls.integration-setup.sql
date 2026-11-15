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

CREATE TABLE public.videos (
  id text PRIMARY KEY,
  published boolean NOT NULL DEFAULT false,
  metadata jsonb
);

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
