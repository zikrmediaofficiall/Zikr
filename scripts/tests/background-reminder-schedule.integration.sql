\set ON_ERROR_STOP on
SET TIME ZONE 'UTC';
DO $assert$
DECLARE
  inserted_count integer;
  cairo_slot timestamptz;
  new_york_slot timestamptz;
  cairo_timezone text;
BEGIN
  SELECT public.plan_background_reminder_deliveries('2026-11-11 07:37:35+00'::timestamptz)
  INTO inserted_count;

  IF inserted_count <> 2 THEN
    RAISE EXCEPTION 'Expected two first-run reminder slots, received %', inserted_count;
  END IF;

  SELECT public.plan_background_reminder_deliveries('2026-11-11 07:37:35+00'::timestamptz)
  INTO inserted_count;

  IF inserted_count <> 0 THEN
    RAISE EXCEPTION 'Expected the same interval window to be idempotent, received % duplicate slot(s)', inserted_count;
  END IF;

  SELECT timezone
  INTO cairo_timezone
  FROM public.background_reminder_preferences
  WHERE user_id = '10000000-0000-4000-8000-000000000001';

  IF cairo_timezone <> 'Africa/Cairo' THEN
    RAISE EXCEPTION 'Expected migration to backfill the Cairo timezone, received %', cairo_timezone;
  END IF;

  SELECT scheduled_at
  INTO cairo_slot
  FROM public.prayer_notification_deliveries
  WHERE push_subscription_id = '30000000-0000-4000-8000-000000000001'
    AND notification_kind = 'dhikr';

  IF cairo_slot <> '2026-11-11 07:45:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Expected the next 15-minute UTC slot at 07:45Z, received %', cairo_slot;
  END IF;

  SELECT scheduled_at
  INTO new_york_slot
  FROM public.prayer_notification_deliveries
  WHERE push_subscription_id = '30000000-0000-4000-8000-000000000002'
    AND notification_kind = 'salawat';

  IF new_york_slot <> '2026-11-11 08:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Expected the next 60-minute UTC slot at 08:00Z, received %', new_york_slot;
  END IF;

  SELECT public.plan_background_reminder_deliveries('2026-11-11 20:37:35+00'::timestamptz)
  INTO inserted_count;

  IF inserted_count <> 1 THEN
    RAISE EXCEPTION 'Expected only the non-quiet-hours account to receive a second slot, received %', inserted_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prayer_notification_deliveries
    WHERE push_subscription_id = '30000000-0000-4000-8000-000000000001'
      AND scheduled_at = '2026-11-11 20:45:00+00'::timestamptz
  ) THEN
    RAISE EXCEPTION 'A Cairo reminder was incorrectly scheduled inside 22:00-06:00 quiet hours';
  END IF;
END
$assert$;

DO $disabled_intervals$
DECLARE
  inserted_count integer;
BEGIN
  UPDATE public.background_reminder_preferences
  SET dhikr_interval_minutes = 0
  WHERE user_id = '10000000-0000-4000-8000-000000000001';

  UPDATE public.background_reminder_preferences
  SET salawat_interval_minutes = 0
  WHERE user_id = '10000000-0000-4000-8000-000000000002';

  SELECT public.plan_background_reminder_deliveries('2026-11-11 21:37:35+00'::timestamptz)
  INTO inserted_count;

  IF inserted_count <> 0 THEN
    RAISE EXCEPTION 'Expected disabled zero-minute intervals to create no reminders, received %', inserted_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prayer_notification_deliveries
    WHERE notification_kind IN ('dhikr', 'salawat')
      AND scheduled_at > '2026-11-11 21:37:35+00'::timestamptz
  ) THEN
    RAISE EXCEPTION 'A disabled zero-minute interval created a future background reminder';
  END IF;
END
$disabled_intervals$;


-- Authenticated users can update only their own preference row through RLS/PostgREST.
-- The database trigger must reject invalid time zones even when application validation is bypassed.
SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
SET ROLE authenticated;

DO $invalid_timezone_update$
DECLARE
  rejected boolean := false;
BEGIN
  BEGIN
    UPDATE public.background_reminder_preferences
    SET timezone = 'Not/A_Real_Time_Zone'
    WHERE user_id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'Expected authenticated invalid timezone update to be rejected by the database trigger';
  END IF;
END
$invalid_timezone_update$;

RESET ROLE;
SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
SET ROLE authenticated;

DO $invalid_timezone_insert$
DECLARE
  rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.background_reminder_preferences (user_id, timezone)
    VALUES ('10000000-0000-4000-8000-000000000003', 'Not/A_Real_Time_Zone');
  EXCEPTION WHEN SQLSTATE '22023' THEN
    rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'Expected authenticated invalid timezone insert to be rejected by the database trigger';
  END IF;
END
$invalid_timezone_insert$;

RESET ROLE;
SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
SET ROLE authenticated;

UPDATE public.background_reminder_preferences
SET timezone = 'America/New_York'
WHERE user_id = '10000000-0000-4000-8000-000000000002';

RESET ROLE;
RESET request.jwt.claim.sub;

DO $valid_timezone$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.background_reminder_preferences
    WHERE user_id = '10000000-0000-4000-8000-000000000002'
      AND timezone = 'America/New_York'
  ) THEN
    RAISE EXCEPTION 'Expected valid IANA timezone update to persist';
  END IF;
END
$valid_timezone$;
