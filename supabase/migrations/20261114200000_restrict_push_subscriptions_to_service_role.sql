-- Push subscription endpoints are validated by the authenticated Next.js API
-- and consumed by the service-role Edge worker. Direct PostgREST writes let a
-- user bypass endpoint validation and could turn the worker into an SSRF client.
-- Keep the rows intact; only remove browser access to this server-managed table.
BEGIN;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

REVOKE ALL PRIVILEGES ON TABLE public.push_subscriptions
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions
  TO service_role;

COMMIT;
