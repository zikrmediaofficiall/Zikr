\set ON_ERROR_STOP on

DO $$
DECLARE
  policy_row record;
BEGIN
  IF current_setting('standard_conforming_strings') <> 'on' THEN
    RAISE EXCEPTION 'Regression fixture requires PostgreSQL standard_conforming_strings=on';
  END IF;

  SELECT qual, with_check INTO policy_row
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rls_initplan_test'
    AND policyname = 'raw_uid_jwt_policy';

  IF policy_row.qual IS NULL
     OR policy_row.qual !~* 'select auth\.uid\(\)'
     OR policy_row.qual !~* 'select auth\.jwt\(\)'
     OR policy_row.qual ~* '(?i)(?<!select )auth\.uid\(\)'
     OR policy_row.qual ~* '(?i)(?<!select )auth\.jwt\(\)' THEN
    RAISE EXCEPTION 'USING policy did not wrap both raw auth calls exactly once: %', policy_row.qual;
  END IF;

  IF policy_row.with_check IS NULL
     OR policy_row.with_check !~* 'select auth\.uid\(\)'
     OR policy_row.with_check !~* 'select auth\.jwt\(\)'
     OR policy_row.with_check ~* '(?i)(?<!select )auth\.uid\(\)'
     OR policy_row.with_check ~* '(?i)(?<!select )auth\.jwt\(\)' THEN
    RAISE EXCEPTION 'WITH CHECK policy did not wrap both raw auth calls exactly once: %', policy_row.with_check;
  END IF;

  SELECT qual INTO policy_row
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rls_initplan_test'
    AND policyname = 'mixed_uid_policy';

  IF policy_row.qual IS NULL
     OR policy_row.qual !~* 'select auth\.uid\(\)'
     OR policy_row.qual ~* '(?i)(?<!select )auth\.uid\(\)'
     OR policy_row.qual ~* '(?i)select\s+\(select auth\.uid\(\)' THEN
    RAISE EXCEPTION 'Mixed policy was skipped or double-wrapped: %', policy_row.qual;
  END IF;

  SELECT qual INTO policy_row
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rls_initplan_test'
    AND policyname = 'wrapped_uid_raw_jwt_policy';

  IF policy_row.qual IS NULL
     OR policy_row.qual !~* 'select auth\.uid\(\)'
     OR policy_row.qual !~* 'select auth\.jwt\(\)'
     OR policy_row.qual ~* '(?i)(?<!select )auth\.uid\(\)'
     OR policy_row.qual ~* '(?i)(?<!select )auth\.jwt\(\)'
     OR policy_row.qual ~* '(?i)select\s+\(select auth\.uid\(\)' THEN
    RAISE EXCEPTION 'Existing initplan was changed or JWT was not repaired: %', policy_row.qual;
  END IF;

  SELECT qual INTO policy_row
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rls_initplan_test'
    AND policyname = 'literal_auth_text_policy';

  IF policy_row.qual IS NULL
     OR position('''auth.uid()''' IN policy_row.qual) = 0
     OR position('''auth.jwt()''' IN policy_row.qual) = 0
     OR policy_row.qual ~* 'select[[:space:]]+auth\.uid\(\)|select[[:space:]]+auth\.jwt\(\)' THEN
    RAISE EXCEPTION 'Function-like text inside SQL string literals was rewritten: %', policy_row.qual;
  END IF;

  SELECT qual INTO policy_row
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rls_initplan_test'
    AND policyname = 'quoted_auth_identifier_policy';

  IF policy_row.qual IS NULL
     OR position('"auth.uid()"' IN policy_row.qual) = 0
     OR position('"auth.jwt()"' IN policy_row.qual) = 0
     OR policy_row.qual ~* 'select[[:space:]]+auth\.uid\(\)|select[[:space:]]+auth\.jwt\(\)' THEN
    RAISE EXCEPTION 'Function-like text inside quoted identifiers was rewritten: %', policy_row.qual;
  END IF;
END
$$;
