BEGIN;

ALTER TABLE public.kids_game_levels ENABLE ROW LEVEL SECURITY;

-- Remove the legacy broad authenticated SELECT policy and command-specific
-- admin write policies. The public game client consumes the reviewed offline
-- snapshot; anon reads are parent-scoped and authenticated admin access is SELECT-only.
DROP POLICY IF EXISTS kids_game_levels_public_read ON public.kids_game_levels;
DROP POLICY IF EXISTS kids_game_levels_admin_all ON public.kids_game_levels;
DROP POLICY IF EXISTS admin_all_kids_game_levels_select ON public.kids_game_levels;
DROP POLICY IF EXISTS kids_game_levels_admin_select ON public.kids_game_levels;
DROP POLICY IF EXISTS kids_game_levels_admin_insert ON public.kids_game_levels;
DROP POLICY IF EXISTS kids_game_levels_admin_update ON public.kids_game_levels;
DROP POLICY IF EXISTS kids_game_levels_admin_delete ON public.kids_game_levels;

-- Game levels are maintained through reviewed migrations and the server-admin
-- command path. No authenticated browser session needs direct DML; the admin
-- catalogue pages are read-only and use the server service-role API.
REVOKE ALL PRIVILEGES ON TABLE public.kids_game_levels
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.kids_game_levels TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.kids_game_levels TO service_role;

CREATE POLICY kids_game_levels_public_read
  ON public.kids_game_levels
  FOR SELECT
  TO anon
  USING (
    published IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.kids_games AS game
      WHERE game.id = kids_game_levels.game_id
        AND game.published IS TRUE
    )
  );

CREATE POLICY kids_game_levels_admin_select
  ON public.kids_game_levels
  FOR SELECT
  TO authenticated
  USING (private.is_admin_user());

COMMENT ON POLICY kids_game_levels_public_read ON public.kids_game_levels
  IS 'Anonymous clients can read only published levels belonging to a published Kids game.';

COMMENT ON POLICY kids_game_levels_admin_select ON public.kids_game_levels
  IS 'Authenticated administrators have read-only access to the full Kids level catalogue; writes use the server-admin path.';

COMMIT;
