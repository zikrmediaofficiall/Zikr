BEGIN;

-- Match direct PostgREST visibility with the public story service, search, and
-- publishing pipeline: only approved, published, non-user-owned stories are public.
DROP POLICY IF EXISTS stories_public_read_published ON public.stories;
CREATE POLICY stories_public_read_published
  ON public.stories
  FOR SELECT
  TO anon
  USING (
    published IS TRUE
    AND is_approved IS TRUE
    AND user_id IS NULL
  );

DROP POLICY IF EXISTS stories_authenticated_read_published_or_admin ON public.stories;
CREATE POLICY stories_authenticated_read_published_or_admin
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (
    (
      published IS TRUE
      AND is_approved IS TRUE
      AND user_id IS NULL
    )
    OR (SELECT private.is_admin_user())
  );

COMMIT;
