\set ON_ERROR_STOP on

INSERT INTO auth.users (id, email, raw_user_meta_data, last_sign_in_at)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'initial@example.test',
  '{"full_name":"Initial User"}'::jsonb,
  '2026-11-17 06:00:00+00'
);

DO $$
DECLARE v_last_login timestamptz;
BEGIN
  SELECT last_login_at INTO v_last_login
  FROM public.profiles
  WHERE id = '11111111-1111-4111-8111-111111111111';
  IF v_last_login IS DISTINCT FROM '2026-11-17 06:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Initial auth insert did not seed last_login_at: %', v_last_login;
  END IF;
END
$$;

UPDATE auth.users
SET last_sign_in_at = '2026-11-17 06:10:00+00'
WHERE id = '11111111-1111-4111-8111-111111111111';

DO $$
DECLARE v_last_login timestamptz;
BEGIN
  SELECT last_login_at INTO v_last_login
  FROM public.profiles
  WHERE id = '11111111-1111-4111-8111-111111111111';
  IF v_last_login IS DISTINCT FROM '2026-11-17 06:10:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Auth sign-in update did not synchronize last_login_at: %', v_last_login;
  END IF;
END
$$;

BEGIN;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
INSERT INTO public.profiles (id, email, role, created_at, updated_at, last_login_at, display_name)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'attacker@example.test',
  'admin',
  '2000-01-01 00:00:00+00',
  '2000-01-01 00:00:00+00',
  '2000-01-01 00:00:00+00',
  'Safe Display Name'
);
COMMIT;

DO $$
DECLARE v_profile record;
BEGIN
  SELECT email, role, created_at, updated_at, last_login_at
  INTO v_profile
  FROM public.profiles
  WHERE id = '22222222-2222-4222-8222-222222222222';

  IF v_profile.email IS NOT NULL
     OR v_profile.role <> 'user'
     OR v_profile.created_at <= '2000-01-01 00:00:00+00'::timestamptz
     OR v_profile.updated_at <= '2000-01-01 00:00:00+00'::timestamptz
     OR v_profile.last_login_at IS NOT NULL THEN
    RAISE EXCEPTION 'Authenticated insert did not normalize server-managed profile fields: %', row_to_json(v_profile);
  END IF;
END
$$;

BEGIN;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
UPDATE public.profiles
SET display_name = 'Updated Display Name',
    updated_at = '2000-01-01 00:00:00+00'
WHERE id = '22222222-2222-4222-8222-222222222222';
COMMIT;

DO $$
DECLARE v_updated_at timestamptz;
BEGIN
  SELECT updated_at INTO v_updated_at
  FROM public.profiles
  WHERE id = '22222222-2222-4222-8222-222222222222';
  IF v_updated_at <= '2000-01-01 00:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Authenticated update was able to spoof updated_at: %', v_updated_at;
  END IF;
END
$$;

DO $$
DECLARE
  rejected boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  rejected := false;
  BEGIN
    UPDATE public.profiles
    SET created_at = '2000-01-01 00:00:00+00'
    WHERE id = '22222222-2222-4222-8222-222222222222';
  EXCEPTION WHEN insufficient_privilege THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'Authenticated user changed profiles.created_at';
  END IF;

  rejected := false;
  BEGIN
    UPDATE public.profiles
    SET last_login_at = '2000-01-01 00:00:00+00'
    WHERE id = '22222222-2222-4222-8222-222222222222';
  EXCEPTION WHEN insufficient_privilege THEN
    rejected := true;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'Authenticated user changed profiles.last_login_at';
  END IF;
END
$$;
