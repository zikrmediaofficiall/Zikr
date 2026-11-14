BEGIN;

-- Public game levels must belong to a published game.
DROP POLICY IF EXISTS kids_game_levels_public_read ON public.kids_game_levels;
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

-- Public questions must belong to a published level and its published parent game.
DROP POLICY IF EXISTS kids_game_questions_public_read ON public.kids_game_questions;
CREATE POLICY kids_game_questions_public_read
  ON public.kids_game_questions
  FOR SELECT
  TO anon
  USING (
    published IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.kids_game_levels AS level
      JOIN public.kids_games AS game
        ON game.id = level.game_id
      WHERE level.id = kids_game_questions.level_id
        AND level.published IS TRUE
        AND game.published IS TRUE
    )
  );

COMMIT;
