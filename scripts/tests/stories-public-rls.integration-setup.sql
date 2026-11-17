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

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(current_setting('test.is_admin', true), 'false') = 'true';
$function$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_user() TO authenticated;

CREATE TABLE public.stories (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  user_id uuid
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Model the currently deployed, overly broad policies before applying the fix.
CREATE POLICY stories_public_read_published
  ON public.stories
  FOR SELECT
  TO anon
  USING (published IS TRUE);

CREATE POLICY stories_authenticated_read_published_or_admin
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (published IS TRUE OR (SELECT private.is_admin_user()));

GRANT SELECT ON public.stories TO anon, authenticated;

INSERT INTO public.stories (id, title, published, is_approved, user_id)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'Approved public story', true, true, NULL),
  ('60000000-0000-4000-8000-000000000002', 'Unapproved story', true, false, NULL),
  ('60000000-0000-4000-8000-000000000003', 'User-owned story', true, true, '70000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000004', 'Draft story', false, true, NULL);
