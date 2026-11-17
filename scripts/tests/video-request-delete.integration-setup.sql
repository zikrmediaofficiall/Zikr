CREATE ROLE service_role NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;

CREATE TABLE public.video_generation_requests (
  id uuid PRIMARY KEY,
  updated_at timestamptz NOT NULL,
  status text NOT NULL,
  video_url text,
  youtube_id text,
  facebook_id text,
  heygen_video_id text,
  provider_job_id text
);
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.social_publish_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text NOT NULL
);
