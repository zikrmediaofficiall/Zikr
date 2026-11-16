-- Serialize concurrent retries of one Kids game result submission.
-- The existing unique index prevents duplicate rows, but without a lock before
-- the RPC's initial SELECT a concurrent retry can still receive 23505/HTTP 500.
-- This function-level two-key lock makes duplicate requests observe the
-- committed result before attempting an INSERT. The insert trigger retains its
-- separate per-user rate-limit lock.
BEGIN;

CREATE OR REPLACE FUNCTION public.kids_record_game_result_internal(
  p_user_id uuid,
  p_game_id text,
  p_client_submission_id text,
  p_score integer,
  p_collectibles integer,
  p_distance integer,
  p_difficulty text,
  p_level smallint,
  p_combo integer,
  p_completed boolean,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (result_id uuid, xp_awarded smallint, player_level smallint, duplicate boolean, newly_unlocked text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.kids_game_results%ROWTYPE;
  v_duplicate boolean := false;
  v_new text[] := '{}';
  v_total_games integer := 0;
  v_total_score bigint := 0;
  v_total_collectibles bigint := 0;
  v_best_score integer := 0;
  v_level smallint := 1;
  v_xp_awarded smallint;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION USING errcode = '42501', message = 'user id required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kids_games WHERE slug = p_game_id AND published = true) THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'unsupported game id';
  END IF;
  IF p_client_submission_id IS NULL OR length(p_client_submission_id) < 8 OR length(p_client_submission_id) > 100 THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'invalid submission id';
  END IF;
  IF coalesce(p_score, -1) < 0 OR coalesce(p_collectibles, -1) < 0 OR coalesce(p_distance, -1) < 0 THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'negative result values are not allowed';
  END IF;
  IF p_score > 100000 OR p_collectibles > 10000 OR p_distance > 1000000 THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'result exceeds global game limits';
  END IF;

  v_xp_awarded := least(
    100,
    floor(greatest(0, p_score)::numeric / 250)
      + least(20, floor(greatest(0, p_collectibles)::numeric / 5))
      + floor(greatest(0, p_distance)::numeric / 2000)
      + case when coalesce(p_completed, false) then 10 else 0 end
  )::smallint;

  -- Serialize the same user's same submission key before the read. The insert
  -- trigger's per-user lock runs later, so it cannot prevent two RPC calls from
  -- both observing no row and racing into the unique index.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text),
    hashtext(p_client_submission_id)
  );

  SELECT * INTO v_result
  FROM public.kids_game_results
  WHERE user_id = p_user_id AND client_submission_id = p_client_submission_id
  LIMIT 1;

  IF v_result.id IS NOT NULL THEN
    v_duplicate := true;
  ELSE
    INSERT INTO public.kids_game_results
      (user_id, game_id, client_submission_id, score, collectibles, distance, xp_awarded, difficulty, metadata, played_at, updated_at)
    VALUES
      (p_user_id, p_game_id, p_client_submission_id, p_score, p_collectibles, p_distance, v_xp_awarded,
       coalesce(nullif(p_difficulty, ''), 'easy'),
       jsonb_build_object(
         'level', least(100, greatest(0, coalesce(p_level, 0))),
         'combo', least(10000, greatest(0, coalesce(p_combo, 0))),
         'completed', coalesce(p_completed, false)
       ) || coalesce(p_metadata, '{}'::jsonb),
       now(), now())
    RETURNING * INTO v_result;

    INSERT INTO public.kids_game_progress
      (user_id, game_id, best_score, best_distance, best_level, play_count, best_combo, level_no, xp, updated_at, total_plays, last_played_at)
    VALUES
      (p_user_id, p_game_id, p_score, p_distance,
       least(100, greatest(0, coalesce(p_level, 0))), 1,
       least(10000, greatest(0, coalesce(p_combo, 0))),
       least(100, greatest(0, coalesce(p_level, 0))), v_xp_awarded, now(), 1, now())
    ON CONFLICT (user_id, game_id) DO UPDATE SET
      best_score = greatest(public.kids_game_progress.best_score, EXCLUDED.best_score),
      best_distance = greatest(public.kids_game_progress.best_distance, EXCLUDED.best_distance),
      best_level = greatest(public.kids_game_progress.best_level, EXCLUDED.best_level),
      play_count = public.kids_game_progress.play_count + 1,
      best_combo = greatest(public.kids_game_progress.best_combo, EXCLUDED.best_combo),
      level_no = greatest(public.kids_game_progress.level_no, EXCLUDED.level_no),
      xp = least(100000000, public.kids_game_progress.xp + EXCLUDED.xp),
      total_plays = public.kids_game_progress.total_plays + 1,
      last_played_at = now(),
      updated_at = now();

    INSERT INTO public.kids_player_progress
      (user_id, xp, level, total_games, total_score, total_collectibles, updated_at)
    VALUES
      (p_user_id, v_xp_awarded, 1, 1, p_score, p_collectibles, now())
    ON CONFLICT (user_id) DO UPDATE SET
      xp = least(100000000, public.kids_player_progress.xp + EXCLUDED.xp),
      total_games = public.kids_player_progress.total_games + 1,
      total_score = least(100000000000, public.kids_player_progress.total_score + EXCLUDED.total_score),
      total_collectibles = least(100000000000, public.kids_player_progress.total_collectibles + EXCLUDED.total_collectibles),
      updated_at = now();
  END IF;

  SELECT total_games, total_score, total_collectibles
    INTO v_total_games, v_total_score, v_total_collectibles
  FROM public.kids_player_progress
  WHERE user_id = p_user_id;

  SELECT coalesce(max(best_score), 0)
    INTO v_best_score
  FROM public.kids_game_progress
  WHERE user_id = p_user_id;

  v_level := greatest(
    1,
    least(
      10000,
      1 + floor(coalesce((SELECT xp FROM public.kids_player_progress WHERE user_id = p_user_id), 0) / 100)::integer
    )
  );

  UPDATE public.kids_player_progress
  SET level = v_level, updated_at = now()
  WHERE user_id = p_user_id;

  WITH candidates(achievement_id, qualifies) AS (
    VALUES
      ('first-game', v_total_games >= 1),
      ('first-high-score', v_best_score >= 1000),
      ('points-1000', v_total_score >= 1000),
      ('points-5000', v_total_score >= 5000),
      ('play-5-games', v_total_games >= 5),
      ('play-10-games', v_total_games >= 10),
      ('collect-100-stars', v_total_collectibles >= 100),
      ('complete-wudu', p_game_id = 'wudu-challenge' AND coalesce(p_completed, false)),
      ('complete-puzzle', p_game_id = 'verse-puzzle' AND coalesce(p_completed, false)),
      ('perfect-memory', p_game_id = 'zikr-memory' AND coalesce(p_completed, false)),
      ('quiz-streak', p_game_id = 'zikr-quiz' AND coalesce(p_combo, 0) >= 3)
  ),
  inserted AS (
    INSERT INTO public.kids_user_achievements (user_id, achievement_id)
    SELECT p_user_id, achievement_id
    FROM candidates
    WHERE qualifies
    ON CONFLICT DO NOTHING
    RETURNING achievement_id
  )
  SELECT coalesce(array_agg(achievement_id ORDER BY achievement_id), '{}')
    INTO v_new
  FROM inserted;

  RETURN QUERY
  SELECT v_result.id, v_result.xp_awarded, v_level, v_duplicate, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.kids_record_game_result_internal(uuid, text, text, integer, integer, integer, text, smallint, integer, boolean, jsonb)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kids_record_game_result_internal(uuid, text, text, integer, integer, integer, text, smallint, integer, boolean, jsonb)
  TO service_role;

COMMIT;
