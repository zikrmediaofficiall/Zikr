-- Keep the public Quran audio catalogue readable without exposing internal
-- Supabase Storage lifecycle metadata or allowing browser-side writes.
-- The server API uses a separate service-role projection for storage-backed rows.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.quran_audio
  FROM PUBLIC, anon, authenticated;

GRANT SELECT (id, surah_id, reciter_id, audio_url, source_url, retrieved_at)
  ON TABLE public.quran_audio
  TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.quran_audio
  TO service_role;

COMMIT;
