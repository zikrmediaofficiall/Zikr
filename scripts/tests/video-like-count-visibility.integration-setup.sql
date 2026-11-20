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

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.videos (
  id uuid PRIMARY KEY,
  published boolean NOT NULL DEFAULT false
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.videos TO anon, authenticated;
CREATE POLICY videos_public_read
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (published IS TRUE);

CREATE TABLE public.video_likes (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;

CREATE POLICY "Users can like videos as themselves"
  ON public.video_likes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can read their own video likes"
  ON public.video_likes
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can remove their own video likes"
  ON public.video_likes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE TABLE public.video_like_counts (
  video_id uuid PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
  like_count bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.video_like_counts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.video_like_counts TO anon, authenticated;
CREATE POLICY "Public can read video like totals"
  ON public.video_like_counts
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.videos (id, published)
VALUES
  ('91000000-0000-4000-8000-000000000001', true),
  ('91000000-0000-4000-8000-000000000002', false);

INSERT INTO public.video_like_counts (video_id, like_count)
VALUES
  ('91000000-0000-4000-8000-000000000001', 3),
  ('91000000-0000-4000-8000-000000000002', 7);
