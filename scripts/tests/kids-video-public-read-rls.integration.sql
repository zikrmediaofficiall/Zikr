\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE anon;
DO $anon_read$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.videos;
  IF visible_rows <> 4 THEN
    RAISE EXCEPTION 'anon must read only legacy general, explicit general, and Kids rows with complete human approval; found %', visible_rows;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.videos
    WHERE id NOT IN (
      'legacy-sql-null-metadata',
      'legacy-no-audience',
      'explicit-general',
      'kids-approved'
    )
  ) THEN
    RAISE EXCEPTION 'anon can read Kids rows without matching human approval, internal videos without an explicit audience, unknown audience, malformed metadata, or unpublished video rows';
  END IF;
END
$anon_read$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
DO $authenticated_read$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.videos;
  IF visible_rows <> 4 THEN
    RAISE EXCEPTION 'authenticated non-admin must read only legacy general, explicit general, and Kids rows with complete human approval; found %', visible_rows;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.videos
    WHERE id NOT IN (
      'legacy-sql-null-metadata',
      'legacy-no-audience',
      'explicit-general',
      'kids-approved'
    )
  ) THEN
    RAISE EXCEPTION 'authenticated non-admin can read Kids rows without matching human approval, internal videos without an explicit audience, unknown audience, malformed metadata, or unpublished video rows';
  END IF;
END
$authenticated_read$;
COMMIT;

BEGIN;
SET LOCAL ROLE service_role;
DO $service_role_read$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.videos;
  IF visible_rows <> 18 THEN
    RAISE EXCEPTION 'service_role must retain full administrative visibility across all 18 fixtures; found %', visible_rows;
  END IF;
END
$service_role_read$;
COMMIT;

DO $verify_contract$
DECLARE
  policy_count integer;
  policy_qual text;
  policy_roles text;
  rls_enabled boolean;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'videos'
    AND cmd = 'SELECT';
  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'public.videos must have exactly one SELECT policy after hardening, found %', policy_count;
  END IF;

  SELECT qual, roles::text
  INTO policy_qual, policy_roles
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'videos'
    AND policyname = 'videos_public_read';
  IF policy_qual IS NULL
     OR policy_qual NOT ILIKE '%jsonb_typeof%'
     OR policy_qual NOT ILIKE '%audience%'
     OR policy_qual NOT ILIKE '%generator%'
     OR policy_qual NOT ILIKE '%kidsVideoQaStatus%'
     OR policy_qual NOT ILIKE '%automatedVideoQa%'
      OR policy_qual NOT ILIKE '%approvalStatus%'
      OR policy_qual NOT ILIKE '%approvalReviewerId%'
      OR policy_qual NOT ILIKE '%approvalReviewedAt%'
      OR policy_qual NOT ILIKE '%approvalSnapshotHash%'
      OR policy_qual NOT ILIKE '%qualityReview%' THEN
    RAISE EXCEPTION 'video public-read policy must enforce canonical metadata, Kids QA and matching human approval';
  END IF;
  IF policy_roles NOT ILIKE '%anon%'
     OR policy_roles NOT ILIKE '%authenticated%'
     OR policy_roles ILIKE '%public%' THEN
    RAISE EXCEPTION 'video public-read policy must target only anon and authenticated roles, found %', policy_roles;
  END IF;

  SELECT relrowsecurity INTO rls_enabled
  FROM pg_catalog.pg_class
  WHERE oid = 'public.videos'::regclass;
  IF rls_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'RLS must remain enabled on public.videos';
  END IF;

  IF NOT has_table_privilege('anon', 'public.videos', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.videos', 'SELECT') THEN
    RAISE EXCEPTION 'anon and authenticated must retain the intended public SELECT grant';
  END IF;
END
$verify_contract$;

SELECT 'KIDS_VIDEO_PUBLIC_READ_RLS_INTEGRATION_PASSED' AS result;
