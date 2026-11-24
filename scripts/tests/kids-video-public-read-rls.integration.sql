\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE anon;
DO $anon_read$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.videos;
  IF visible_rows <> 5 THEN
    RAISE EXCEPTION 'anon must read only legacy general, explicit general, and Kids rows with complete automated QA approval; found %', visible_rows;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.videos
    WHERE id NOT IN (
      'legacy-sql-null-metadata',
      'legacy-no-audience',
      'explicit-general',
      'kids-approved',
      'kids-youtube-fallback'
    )
  ) THEN
    RAISE EXCEPTION 'anon can read Kids rows without matching automated QA approval, Kids-category rows with missing or conflicting metadata, conflicting general/Kids provenance markers, unknown audience, malformed metadata, or unpublished video rows';
  END IF;
END
$anon_read$;
DO $anon_hidden_category$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.video_categories
    WHERE id = '20000000-0000-4000-8000-000000000003'
  ) THEN
    RAISE EXCEPTION 'anon must not see the hidden Kids category fixture directly';
  END IF;
END
$anon_hidden_category$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
DO $authenticated_read$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.videos;
  IF visible_rows <> 5 THEN
    RAISE EXCEPTION 'authenticated non-admin must read only legacy general, explicit general, and Kids rows with complete automated QA approval; found %', visible_rows;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.videos
    WHERE id NOT IN (
      'legacy-sql-null-metadata',
      'legacy-no-audience',
      'explicit-general',
      'kids-approved',
      'kids-youtube-fallback'
    )
  ) THEN
    RAISE EXCEPTION 'authenticated non-admin can read Kids rows without matching automated QA approval, Kids-category rows with missing or conflicting metadata, conflicting general/Kids provenance markers, unknown audience, malformed metadata, or unpublished video rows';
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
  IF visible_rows <> 45 THEN
    RAISE EXCEPTION 'service_role must retain full administrative visibility across all 45 fixtures; found %', visible_rows;
  END IF;
END
$service_role_read$;
COMMIT;

DO $verify_contract$
DECLARE
  policy_count integer;
  policy_qual text;
  policy_roles text;
  restrictive_policy_qual text;
  restrictive_policy_roles text;
  rls_enabled boolean;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'videos'
    AND cmd = 'SELECT';
  IF policy_count <> 2 THEN
    RAISE EXCEPTION 'public.videos must have one permissive and one restrictive SELECT policy after hardening, found %', policy_count;
  END IF;
  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'videos'
    AND cmd = 'SELECT' AND permissive = 'PERMISSIVE';
  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'public.videos must retain exactly one permissive SELECT policy, found %', policy_count;
  END IF;
  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'videos'
    AND cmd = 'SELECT' AND permissive = 'RESTRICTIVE'
    AND policyname = 'videos_kids_category_requires_current_automated_qa';
  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'public.videos must have exactly one restrictive Kids-category SELECT policy, found %', policy_count;
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
      OR policy_qual NOT ILIKE '%qualityReview%'
      OR policy_qual NOT ILIKE '%zikr_video_factory%'
      OR policy_qual NOT ILIKE '%system:zikr-video-factory%'
      OR policy_qual NOT ILIKE '%videoGenerationRequestId%'
      OR policy_qual NOT ILIKE '%generatedVideoUrl%'
      OR policy_qual NOT ILIKE '%mediaState%'
      OR policy_qual NOT ILIKE '%sourceMediaMissing%'
      OR policy_qual NOT ILIKE '%res.cloudinary.com%'
      OR policy_qual NOT ILIKE '%sourceHash%'
      OR policy_qual NOT ILIKE '%contentHash%'
      OR policy_qual NOT ILIKE '%templateVersion%'
      OR policy_qual NOT ILIKE '%snapshotHash%'
      OR policy_qual NOT ILIKE '%engineVersion%'
      OR policy_qual NOT ILIKE '%reviewerId%'
      OR policy_qual NOT ILIKE '%reviewedAt%'
      OR policy_qual NOT ILIKE '%sourceVerified%'
      OR policy_qual NOT ILIKE '%audioReviewed%'
      OR policy_qual NOT ILIKE '%visualsReviewed%'
      OR policy_qual NOT ILIKE '%captionsReviewed%'
      OR policy_qual NOT ILIKE '%rightsReviewed%'
      OR policy_qual NOT ILIKE '%contentFormat%'
      OR policy_qual NOT ILIKE '%aiMode%'
      OR policy_qual NOT ILIKE '%sourceType%'
      OR policy_qual NOT ILIKE '%seriesId%'
      OR policy_qual NOT ILIKE '%seriesTitle%'
      OR policy_qual NOT ILIKE '%learningObjective%'
      OR policy_qual NOT ILIKE '%seasonNumber%'
      OR policy_qual NOT ILIKE '%episodeNumber%'
      OR policy_qual NOT ILIKE '%category%'
      OR policy_qual NOT ILIKE '%contentType%'
      OR policy_qual NOT ILIKE '%contentFormat%'
      OR policy_qual NOT ILIKE '%ageGroup%'
      OR policy_qual NOT ILIKE '%generationMode%'
      OR policy_qual NOT ILIKE '%sourceId%'
      OR policy_qual NOT ILIKE '%curatedSourceId%'
      OR policy_qual NOT ILIKE '%publicPath%'
      OR policy_qual NOT ILIKE '%public_path%'
     OR policy_qual NOT ILIKE '%video_catalog_has_current_automated_kids_qa%'
      OR policy_qual NOT ILIKE '%youtubePublishedUrl%' THEN
    RAISE EXCEPTION 'video public-read policy must enforce canonical metadata, Kids QA, matching automated QA approval, and a current linked request';
  END IF;
  IF policy_roles NOT ILIKE '%anon%'
     OR policy_roles NOT ILIKE '%authenticated%'
     OR policy_roles ILIKE '%public%' THEN
    RAISE EXCEPTION 'video public-read policy must target only anon and authenticated roles, found %', policy_roles;
  END IF;

  SELECT qual, roles::text
  INTO restrictive_policy_qual, restrictive_policy_roles
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'videos'
    AND policyname = 'videos_kids_category_requires_current_automated_qa';
  IF restrictive_policy_qual IS NULL
     OR restrictive_policy_qual NOT ILIKE '%video_category_is_kids%'
     OR restrictive_policy_qual NOT ILIKE '%category_id%'
     OR restrictive_policy_qual NOT ILIKE '%audience%'
     OR restrictive_policy_qual NOT ILIKE '%cloudinary_master%'
     OR restrictive_policy_qual NOT ILIKE '%video_catalog_has_current_automated_kids_qa%'
     OR restrictive_policy_qual NOT ILIKE '%youtubePublishedUrl%'
     OR restrictive_policy_roles NOT ILIKE '%anon%'
     OR restrictive_policy_roles NOT ILIKE '%authenticated%'
     OR restrictive_policy_roles ILIKE '%public%' THEN
    RAISE EXCEPTION 'restrictive video policy must require the complete approved Kids contract for every Kids category';
  END IF;

  IF NOT has_function_privilege('anon', 'private.video_category_is_kids(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.video_category_is_kids(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'public roles must be able to evaluate the private Kids-category predicate through RLS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS schema ON schema.oid = function.pronamespace
    WHERE schema.nspname = 'private'
      AND function.proname = 'video_category_is_kids'
      AND function.prosecdef IS TRUE
      AND function.proconfig @> ARRAY['search_path=""']
      AND pg_catalog.pg_get_userbyid(function.proowner) = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Kids-category predicate must be owned by postgres and use SECURITY DEFINER with an empty search_path';
  END IF;
  IF pg_get_functiondef('private.video_category_is_kids(uuid)'::regprocedure) NOT ILIKE '%video_categories%'
     OR pg_get_functiondef('private.video_category_is_kids(uuid)'::regprocedure) NOT ILIKE '%kids-stories%' THEN
    RAISE EXCEPTION 'Kids-category predicate must resolve the canonical category slug independently of public category visibility';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
  FROM pg_catalog.pg_class
  WHERE oid = 'public.videos'::regclass;
  IF rls_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'RLS must remain enabled on public.videos';
  END IF;

  IF has_table_privilege('anon', 'public.video_generation_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.video_generation_requests', 'SELECT') THEN
    RAISE EXCEPTION 'generation request rows must remain private to the server and service role';
  END IF;

  IF NOT has_function_privilege('anon', 'private.video_catalog_has_current_automated_kids_qa(jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.video_catalog_has_current_automated_kids_qa(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'public roles must be able to evaluate the private approval predicate through RLS';
  END IF;

  IF pg_get_functiondef('private.video_catalog_has_current_automated_kids_qa(jsonb)'::regprocedure) NOT ILIKE '%extensions.digest%' THEN
    RAISE EXCEPTION 'public Kids video RLS must recompute the current request approval snapshot hash';
  END IF;

  IF NOT has_table_privilege('anon', 'public.videos', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.videos', 'SELECT') THEN
    RAISE EXCEPTION 'anon and authenticated must retain the intended public SELECT grant';
  END IF;
END
$verify_contract$;

SELECT 'KIDS_VIDEO_PUBLIC_READ_RLS_INTEGRATION_PASSED' AS result;
