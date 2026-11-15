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
  ('kids-approved', true, '{"audience":"kids","generator":"zikr_internal_video_factory","kidsVideoQaStatus":"passed","automatedVideoQa":{"status":"passed"}}'::jsonb),
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
