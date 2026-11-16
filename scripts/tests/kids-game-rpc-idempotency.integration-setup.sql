CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO service_role;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY
);

CREATE TABLE public.kids_games (
  slug text PRIMARY KEY,
  published boolean NOT NULL DEFAULT false
);

INSERT INTO public.kids_games (slug, published)
VALUES ('zikr-runner', true);

CREATE TABLE public.kids_game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  client_submission_id text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  collectibles integer NOT NULL DEFAULT 0,
  distance integer NOT NULL DEFAULT 0,
  xp_awarded smallint NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'easy',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  played_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX kids_game_results_user_client_unique
  ON public.kids_game_results (user_id, client_submission_id);

CREATE TABLE public.kids_game_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  best_score integer NOT NULL DEFAULT 0,
  best_distance integer NOT NULL DEFAULT 0,
  best_level smallint NOT NULL DEFAULT 0,
  play_count integer NOT NULL DEFAULT 0,
  best_combo integer NOT NULL DEFAULT 0,
  level_no integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  total_plays integer NOT NULL DEFAULT 0,
  last_played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE public.kids_player_progress (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level smallint NOT NULL DEFAULT 1,
  total_games integer NOT NULL DEFAULT 0,
  total_score bigint NOT NULL DEFAULT 0,
  total_collectibles bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kids_achievements (
  id text PRIMARY KEY
);

INSERT INTO public.kids_achievements (id)
VALUES
  ('first-game'),
  ('first-high-score'),
  ('points-1000'),
  ('points-5000'),
  ('play-5-games'),
  ('play-10-games'),
  ('collect-100-stars'),
  ('complete-wudu'),
  ('complete-puzzle'),
  ('perfect-memory'),
  ('quiz-streak');

CREATE TABLE public.kids_user_achievements (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.kids_achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

INSERT INTO public.profiles (id)
VALUES ('11111111-1111-4111-8111-111111111111');

-- Deliberately delay inserts after the RPC's initial SELECT. Without the
-- function-level idempotency lock, concurrent calls can all observe no row,
-- then serialize only inside the later per-user trigger and collide on the
-- unique (user_id, client_submission_id) index.
CREATE OR REPLACE FUNCTION public.kids_test_delay_result_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_sleep(2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER a_kids_test_delay_result_insert
BEFORE INSERT ON public.kids_game_results
FOR EACH ROW
EXECUTE FUNCTION public.kids_test_delay_result_insert();
