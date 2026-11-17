\set ON_ERROR_STOP on

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stories'
      AND policyname = 'stories_public_read_published'
      AND qual ILIKE '%is_approved%'
      AND qual ILIKE '%user_id%'
  ) THEN
    RAISE EXCEPTION 'Public story policy must require approval and a null owner';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stories'
      AND policyname = 'stories_authenticated_read_published_or_admin'
      AND qual ILIKE '%is_approved%'
      AND qual ILIKE '%user_id%'
      AND qual ILIKE '%is_admin_user%'
  ) THEN
    RAISE EXCEPTION 'Authenticated story policy must require approved global rows or admin access';
  END IF;
END
$policy$;

BEGIN;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  IF (SELECT count(*) FROM public.stories) <> 1 THEN
    RAISE EXCEPTION 'Anonymous clients must see only approved published global stories';
  END IF;
END
$anon$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL test.is_admin = 'false';
DO $authenticated$
BEGIN
  IF (SELECT count(*) FROM public.stories) <> 1 THEN
    RAISE EXCEPTION 'Authenticated non-admin clients must see only approved published global stories';
  END IF;
END
$authenticated$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL test.is_admin = 'true';
DO $admin$
BEGIN
  IF (SELECT count(*) FROM public.stories) <> 4 THEN
    RAISE EXCEPTION 'Admins must retain access to drafts, unapproved, and user-owned stories';
  END IF;
END
$admin$;
COMMIT;
