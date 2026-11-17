-- The original prayer scheduler migration skips pg_cron/pg_net when unavailable.
-- A later project-ref reconciliation must preserve that optional-dispatcher contract:
-- never leave a minute cron job calling net.http_post when pg_net is absent.
--
-- Only the exact ZIKR prayer worker job is removed, and only in environments
-- without pg_net. Production has pg_net installed, so this migration is a no-op there.
DO $do$
DECLARE
  v_cron_job_oid regclass := to_regclass('cron.job');
  v_job_ids bigint[];
  v_job_id bigint;
BEGIN
  IF v_cron_job_oid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN;
  END IF;

  IF to_regprocedure('cron.unschedule(bigint)') IS NULL THEN
    RETURN;
  END IF;

  IF (
    SELECT count(*)
    FROM pg_attribute
    WHERE attrelid = v_cron_job_oid
      AND attname IN ('jobid', 'jobname', 'command')
      AND NOT attisdropped
  ) <> 3 THEN
    RETURN;
  END IF;

  EXECUTE $sql$
    SELECT array_agg(jobid ORDER BY jobid)
    FROM cron.job
    WHERE jobname = 'zikr-prayer-push-dispatch'
      AND command ILIKE '%functions/v1/prayer-notification-worker%'
      AND command ILIKE '%get_push_scheduler_secret%'
  $sql$
  INTO v_job_ids;

  IF v_job_ids IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_job_id IN ARRAY v_job_ids LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  RAISE NOTICE 'Unschedule % ZIKR prayer push dispatcher job(s): pg_net is unavailable', cardinality(v_job_ids);
END
$do$;
