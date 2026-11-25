DO $seed_check$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.admin_omnis_execution_ledger;
  IF v_count <> 45 THEN
    RAISE EXCEPTION 'Expected 45 unique OMNIS tasks, found %', v_count;
  END IF;
END;
$seed_check$;

SELECT pg_catalog.set_config('app.omnis_admin', 'false', false);
SET ROLE authenticated;
DO $rls_deny$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.admin_omnis_execution_ledger;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Non-admin authenticated users must not read the OMNIS ledger';
  END IF;
END;
$rls_deny$;
RESET ROLE;

SELECT pg_catalog.set_config('app.omnis_admin', 'true', false);
SET ROLE authenticated;
DO $rls_allow$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.admin_omnis_execution_ledger;
  IF v_count <> 45 THEN
    RAISE EXCEPTION 'Admin read policy must expose all 45 ledger tasks';
  END IF;
END;
$rls_allow$;
RESET ROLE;

SET ROLE authenticated;
DO $write_deny$
BEGIN
  BEGIN
    UPDATE public.admin_omnis_execution_ledger
    SET title = 'not allowed'
    WHERE task_key = 'OMNIS-P00-03';
    RAISE EXCEPTION 'Authenticated clients must not update the OMNIS ledger directly';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$write_deny$;
RESET ROLE;

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'omnis-test@example.invalid')
ON CONFLICT (id) DO NOTHING;

SET ROLE service_role;
SELECT public.transition_admin_omnis_task(
  'OMNIS-P00-03', 'in_progress', '00000000-0000-0000-0000-000000000001',
  'Integration test started', NULL, NULL
);
SELECT public.transition_admin_omnis_task(
  'OMNIS-P00-03', 'in_progress', '00000000-0000-0000-0000-000000000001',
  'Duplicate state transition must be a no-op', NULL, NULL
);
DO $idempotency$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.admin_omnis_execution_events
  WHERE task_key = 'OMNIS-P00-03';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Same-state transition must not create duplicate events; found %', v_count;
  END IF;
END;
$idempotency$;

DO $completion_guard$
BEGIN
  BEGIN
    PERFORM public.transition_admin_omnis_task(
      'OMNIS-P00-03', 'completed', '00000000-0000-0000-0000-000000000001',
      'Missing commit is not accepted', NULL, 'Tests passed successfully'
    );
    RAISE EXCEPTION 'Completion without a commit SHA must be rejected';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN NULL;
  END;
END;
$completion_guard$;

SELECT public.transition_admin_omnis_task(
  'OMNIS-P00-03', 'blocked', '00000000-0000-0000-0000-000000000001',
  'Waiting for deployment verification', NULL, NULL
);
SELECT public.transition_admin_omnis_task(
  'OMNIS-P00-03', 'completed', '00000000-0000-0000-0000-000000000001',
  'Integration evidence recorded',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'PostgreSQL 17 RLS, idempotency, state-transition and completion-guard checks passed.'
);

DO $append_only$
BEGIN
  BEGIN
    UPDATE public.admin_omnis_execution_events
    SET note = 'tampered'
    WHERE task_key = 'OMNIS-P00-03';
    RAISE EXCEPTION 'OMNIS event history must reject mutation';
  EXCEPTION
    WHEN SQLSTATE '42501' THEN NULL;
  END;
END;
$append_only$;

DO $history_check$
DECLARE
  v_state text;
  v_previous text;
  v_events integer;
BEGIN
  SELECT state INTO v_state
  FROM public.admin_omnis_execution_ledger
  WHERE task_key = 'OMNIS-P00-03';

  SELECT previous_state INTO v_previous
  FROM public.admin_omnis_execution_events
  WHERE task_key = 'OMNIS-P00-03'
    AND next_state = 'completed'
  LIMIT 1;

  SELECT count(*) INTO v_events
  FROM public.admin_omnis_execution_events
  WHERE task_key = 'OMNIS-P00-03';

  IF v_state <> 'completed' THEN
    RAISE EXCEPTION 'Expected completed final state, found %', v_state;
  END IF;
  IF v_previous <> 'blocked' THEN
    RAISE EXCEPTION 'Expected previous_state=blocked in final event, found %', v_previous;
  END IF;
  IF v_events <> 3 THEN
    RAISE EXCEPTION 'Expected exactly 3 state-change events, found %', v_events;
  END IF;
END;
$history_check$;
RESET ROLE;

SELECT 'OMNIS_EXECUTION_LEDGER_INTEGRATION_PASSED' AS result;
