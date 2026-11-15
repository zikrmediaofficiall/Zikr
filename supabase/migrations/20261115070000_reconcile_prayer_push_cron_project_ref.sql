-- Keep the prayer push dispatcher aligned with the active Supabase project.
-- The original scheduler migration is immutable and still contains its historical
-- project URL. This forward migration makes clean replays converge on production's
-- canonical project without invoking the Edge Function or changing subscription data.
DO $do$
DECLARE
  v_cron_job_oid regclass := to_regclass('cron.job');
BEGIN
  IF v_cron_job_oid IS NULL THEN
    RETURN;
  END IF;

  IF (
    SELECT count(*)
    FROM pg_attribute
    WHERE attrelid = v_cron_job_oid
      AND attname IN ('jobid', 'jobname', 'command', 'schedule', 'active')
      AND NOT attisdropped
  ) <> 5
    OR to_regprocedure('cron.alter_job(bigint,text,text,text,text,boolean)') IS NULL
    OR to_regprocedure('cron.unschedule(bigint)') IS NULL
    OR to_regprocedure('cron.schedule(text,text,text)') IS NULL
  THEN
    RETURN;
  END IF;

  EXECUTE $schedule$
    DO $inner$
    DECLARE
      v_job_ids bigint[];
      v_job_count bigint;
      v_job_id bigint;
      v_command text;
      v_schedule text;
      v_active boolean;
      v_job_command constant text := $command$
        SELECT net.http_post(
          url := 'https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/prayer-notification-worker',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || public.get_push_scheduler_secret()
          ),
          body := jsonb_build_object('source', 'pg_cron')
        )
        WHERE EXISTS (SELECT 1 FROM public.push_subscriptions WHERE is_active);
      $command$;
    BEGIN
      SELECT array_agg(jobid ORDER BY jobid), count(*)
      INTO v_job_ids, v_job_count
      FROM cron.job
      WHERE jobname = 'zikr-prayer-push-dispatch';

      IF v_job_count = 1 THEN
        SELECT jobid, command, schedule, active
        INTO v_job_id, v_command, v_schedule, v_active
        FROM cron.job
        WHERE jobname = 'zikr-prayer-push-dispatch';

        IF regexp_replace(btrim(v_command), '[[:space:]]+', ' ', 'g') =
             regexp_replace(btrim(v_job_command), '[[:space:]]+', ' ', 'g')
          AND v_schedule = '* * * * *'
          AND v_active
        THEN
          RETURN;
        END IF;

        PERFORM cron.alter_job(
          job_id := v_job_id,
          schedule := '* * * * *',
          command := v_job_command,
          active := true
        );
        RETURN;
      END IF;

      IF v_job_ids IS NOT NULL THEN
        FOREACH v_job_id IN ARRAY v_job_ids LOOP
          PERFORM cron.unschedule(v_job_id);
        END LOOP;
      END IF;

      PERFORM cron.schedule(
        'zikr-prayer-push-dispatch',
        '* * * * *',
        v_job_command
      );
    END
    $inner$;
  $schedule$;
END
$do$;
