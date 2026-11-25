-- Versioned, typed history for the 11 editable OMNIS settings.
-- Internal cursors, locks, workflow state, and specialized JSON settings are intentionally excluded.
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_setting_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  value jsonb NOT NULL,
  operation text NOT NULL CHECK (operation IN ('baseline', 'update', 'rollback')),
  source_version_id uuid NULL REFERENCES public.admin_setting_versions(id) ON DELETE RESTRICT,
  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_setting_versions_source_check CHECK (
    (operation = 'rollback' AND source_version_id IS NOT NULL)
    OR (operation <> 'rollback' AND source_version_id IS NULL)
  ),
  CONSTRAINT admin_setting_versions_value_check CHECK (
    CASE
      WHEN setting_key IN (
        'require_mfa_for_destructive',
        'maintenance_mode',
        'admin_alerts_enabled',
        'video_automation_enabled',
        'video_automation_auto_publish',
        'video_automation_ai_enabled'
      ) THEN jsonb_typeof(value) = 'boolean'
      WHEN setting_key = 'search_result_limit' THEN
        CASE WHEN jsonb_typeof(value) = 'number' THEN
          (value #>> '{}')::numeric BETWEEN 10 AND 100
          AND (value #>> '{}')::numeric = trunc((value #>> '{}')::numeric)
        ELSE false END
      WHEN setting_key = 'video_automation_batch_size' THEN
        CASE WHEN jsonb_typeof(value) = 'number' THEN
          (value #>> '{}')::numeric BETWEEN 1 AND 10
          AND (value #>> '{}')::numeric = trunc((value #>> '{}')::numeric)
        ELSE false END
      WHEN setting_key = 'video_automation_daily_target' THEN
        CASE WHEN jsonb_typeof(value) = 'number' THEN
          (value #>> '{}')::numeric BETWEEN 1 AND 24
          AND (value #>> '{}')::numeric = trunc((value #>> '{}')::numeric)
        ELSE false END
      WHEN setting_key = 'video_automation_ai_attempts_per_run' THEN
        CASE WHEN jsonb_typeof(value) = 'number' THEN
          (value #>> '{}')::numeric BETWEEN 0 AND 4
          AND (value #>> '{}')::numeric = trunc((value #>> '{}')::numeric)
        ELSE false END
      WHEN setting_key = 'video_automation_video_seconds' THEN
        CASE WHEN jsonb_typeof(value) = 'number' THEN
          (value #>> '{}')::numeric BETWEEN 10 AND 45
          AND (value #>> '{}')::numeric = trunc((value #>> '{}')::numeric)
        ELSE false END
      ELSE false
    END
  )
);

CREATE INDEX IF NOT EXISTS admin_setting_versions_key_created_idx
  ON public.admin_setting_versions (setting_key, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_setting_versions_source_idx
  ON public.admin_setting_versions (source_version_id)
  WHERE source_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_setting_versions_actor_idx
  ON public.admin_setting_versions (actor_user_id)
  WHERE actor_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admin_setting_versions_one_baseline_idx
  ON public.admin_setting_versions (setting_key)
  WHERE operation = 'baseline';

ALTER TABLE public.admin_setting_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_setting_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_setting_versions TO service_role;

CREATE OR REPLACE FUNCTION public.reject_admin_setting_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Admin setting version history is append-only';
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_admin_setting_version_mutation()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS admin_setting_versions_immutable
  ON public.admin_setting_versions;
CREATE TRIGGER admin_setting_versions_immutable
  BEFORE UPDATE OR DELETE ON public.admin_setting_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_admin_setting_version_mutation();

-- Seed one non-secret baseline per currently configured editable setting.
INSERT INTO public.admin_setting_versions (
  setting_key, value, operation, actor_user_id, created_at
)
SELECT
  s.key,
  s.value,
  'baseline',
  s.updated_by,
  COALESCE(s.updated_at, now())
FROM public.admin_settings AS s
WHERE s.key IN (
  'require_mfa_for_destructive',
  'maintenance_mode',
  'admin_alerts_enabled',
  'search_result_limit',
  'video_automation_enabled',
  'video_automation_auto_publish',
  'video_automation_batch_size',
  'video_automation_ai_enabled',
  'video_automation_daily_target',
  'video_automation_ai_attempts_per_run',
  'video_automation_video_seconds'
)
ON CONFLICT (setting_key) WHERE operation = 'baseline' DO NOTHING;

CREATE OR REPLACE FUNCTION public.save_admin_setting_version(
  p_setting_key text,
  p_value jsonb,
  p_actor_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_version_id uuid;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated admin actor is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_by, updated_at)
  VALUES (p_setting_key, p_value, p_actor_user_id, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_setting_versions (
    setting_key, value, operation, actor_user_id
  )
  VALUES (p_setting_key, p_value, 'update', p_actor_user_id)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_admin_setting_version(
  p_version_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_setting_key text;
  v_value jsonb;
  v_new_version_id uuid;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated admin actor is required' USING ERRCODE = '22023';
  END IF;

  SELECT setting_key, value
    INTO v_setting_key, v_value
  FROM public.admin_setting_versions
  WHERE id = p_version_id
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown admin setting version' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_by, updated_at)
  VALUES (v_setting_key, v_value, p_actor_user_id, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_setting_versions (
    setting_key, value, operation, source_version_id, actor_user_id
  )
  VALUES (v_setting_key, v_value, 'rollback', p_version_id, p_actor_user_id)
  RETURNING id INTO v_new_version_id;

  RETURN jsonb_build_object(
    'id', v_new_version_id,
    'setting_key', v_setting_key,
    'value', v_value,
    'operation', 'rollback',
    'source_version_id', p_version_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_admin_setting_version(text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_setting_version(text, jsonb, uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.restore_admin_setting_version(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_admin_setting_version(uuid, uuid)
  TO service_role;

-- Index the three foreign keys identified by the Supabase performance advisor.
CREATE INDEX IF NOT EXISTS admin_omnis_events_actor_user_idx
  ON public.admin_omnis_execution_events (actor_user_id)
  WHERE actor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_omnis_ledger_created_by_idx
  ON public.admin_omnis_execution_ledger (created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_omnis_ledger_updated_by_idx
  ON public.admin_omnis_execution_ledger (updated_by)
  WHERE updated_by IS NOT NULL;

COMMENT ON TABLE public.admin_setting_versions IS
  'Append-only, typed and non-secret version history for the 11 editable ZIKR admin settings. All writes are server-only.';
COMMENT ON FUNCTION public.save_admin_setting_version(text, jsonb, uuid) IS
  'Atomically applies one typed admin setting value and appends its version row. Execute is restricted to service_role.';
COMMENT ON FUNCTION public.restore_admin_setting_version(uuid, uuid) IS
  'Atomically restores a prior typed setting version and appends a rollback version. Execute is restricted to service_role.';

COMMIT;
