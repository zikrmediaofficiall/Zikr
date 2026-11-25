\set ON_ERROR_STOP on

DO $contract$
DECLARE
  job_count integer;
  job_command text;
  job_schedule text;
  job_active boolean;
  expected_command constant text := $expected$
    SELECT net.http_post(
      url := 'https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/prayer-notification-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || public.get_push_scheduler_secret()
      ),
      body := jsonb_build_object('source', 'pg_cron')
    )
    WHERE EXISTS (SELECT 1 FROM public.push_subscriptions WHERE is_active);
  $expected$;
BEGIN
  SELECT count(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'zikr-prayer-push-dispatch';

  IF job_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one prayer push cron job, found %', job_count;
  END IF;

  SELECT command, schedule, active
    INTO job_command, job_schedule, job_active
  FROM cron.job
  WHERE jobname = 'zikr-prayer-push-dispatch';

  IF job_schedule <> '* * * * *' OR job_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'prayer push cron schedule must be active every minute';
  END IF;
  IF regexp_replace(btrim(job_command), '[[:space:]]+', ' ', 'g')
       <> regexp_replace(btrim(expected_command), '[[:space:]]+', ' ', 'g') THEN
    RAISE EXCEPTION 'prayer push cron command must match the authenticated canonical request and active-subscription guard';
  END IF;
END;
$contract$;

SELECT 'PRAYER_PUSH_CRON_RECONCILIATION_PASSED' AS result;
