BEGIN;

-- Do not silently rewrite user preferences. Refuse the migration if any existing
-- row contains a timezone that PostgreSQL cannot resolve.
DO $existing_timezone_values$
DECLARE
  invalid_count bigint := 0;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM public.background_reminder_preferences AS preferences
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS zones
    WHERE zones.name = preferences.timezone
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce background reminder time zones: % existing row(s) contain an invalid IANA timezone',
      invalid_count
      USING ERRCODE = '22023';
  END IF;
END
$existing_timezone_values$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.enforce_background_reminder_timezone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.timezone IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS zones
    WHERE zones.name = NEW.timezone
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'background_reminder_preferences.timezone must be a valid IANA timezone';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_background_reminder_timezone()
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.enforce_background_reminder_timezone()
  TO authenticated, service_role;

DROP TRIGGER IF EXISTS background_reminder_preferences_timezone_guard
  ON public.background_reminder_preferences;

CREATE TRIGGER background_reminder_preferences_timezone_guard
BEFORE INSERT OR UPDATE OF timezone
ON public.background_reminder_preferences
FOR EACH ROW
EXECUTE FUNCTION private.enforce_background_reminder_timezone();

COMMENT ON FUNCTION private.enforce_background_reminder_timezone()
  IS 'Reject invalid timezone names on background reminder preference writes; invoked only by the preference table trigger.';

COMMIT;
