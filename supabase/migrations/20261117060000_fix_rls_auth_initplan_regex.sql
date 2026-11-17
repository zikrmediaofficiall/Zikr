-- Repair the over-escaped regexp patterns in the historical 20260814143804
-- and 20260814143905 migrations. With standard_conforming_strings=on those
-- patterns match a literal backslash rather than auth.uid()/auth.jwt().
-- The negative lookbehind keeps already-wrapped SELECT initplans unchanged and
-- also handles policies that mix wrapped and unwrapped calls.
DO $$
DECLARE
  policy_row record;
  using_expr text;
  check_expr text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~* 'auth\.uid\(\)|auth\.jwt\(\)'
        OR coalesce(with_check, '') ~* 'auth\.uid\(\)|auth\.jwt\(\)'
      )
  LOOP
    using_expr := CASE
      WHEN policy_row.qual IS NULL THEN NULL
      ELSE regexp_replace(
        regexp_replace(
          policy_row.qual,
          E'(?i)(?<!select )auth\\.uid\\(\\)',
          '(select auth.uid())',
          'g'
        ),
        E'(?i)(?<!select )auth\\.jwt\\(\\)',
        '(select auth.jwt())',
        'g'
      )
    END;

    check_expr := CASE
      WHEN policy_row.with_check IS NULL THEN NULL
      ELSE regexp_replace(
        regexp_replace(
          policy_row.with_check,
          E'(?i)(?<!select )auth\\.uid\\(\\)',
          '(select auth.uid())',
          'g'
        ),
        E'(?i)(?<!select )auth\\.jwt\\(\\)',
        '(select auth.jwt())',
        'g'
      )
    END;

    IF policy_row.qual IS NOT NULL
       AND using_expr IS DISTINCT FROM policy_row.qual THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING %s',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        using_expr
      );
    END IF;

    IF policy_row.with_check IS NOT NULL
       AND check_expr IS DISTINCT FROM policy_row.with_check THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK %s',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        check_expr
      );
    END IF;
  END LOOP;
END
$$;
