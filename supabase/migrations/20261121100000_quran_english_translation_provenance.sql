-- Store translation provenance and safely import the named Pickthall English edition.
-- The Arabic source row is matched before any English text can be written.
ALTER TABLE public.quran_ayahs
  ADD COLUMN IF NOT EXISTS text_en_edition text;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.quran_ayahs'::regclass
      AND conname = 'quran_ayahs_text_en_edition_allowlist'
  ) THEN
    ALTER TABLE public.quran_ayahs
      ADD CONSTRAINT quran_ayahs_text_en_edition_allowlist
      CHECK (text_en_edition IS NULL OR text_en_edition = 'en.pickthall');
  END IF;
END;
$constraint$;

COMMENT ON COLUMN public.quran_ayahs.text_en_edition IS
  'Identifier of the named upstream English translation edition used for text_en; currently en.pickthall.';

CREATE OR REPLACE FUNCTION public.admin_sync_quran_english_batch(
  p_surah_id integer,
  p_edition text,
  p_ayahs jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_expected integer;
  v_matched integer;
  v_updated integer := 0;
BEGIN
  IF p_surah_id IS NULL OR p_surah_id < 1 OR p_surah_id > 114 THEN
    RAISE EXCEPTION 'invalid Quran surah id' USING ERRCODE = '22023';
  END IF;
  IF p_edition IS DISTINCT FROM 'en.pickthall' THEN
    RAISE EXCEPTION 'unsupported Quran translation edition' USING ERRCODE = '22023';
  END IF;
  IF p_ayahs IS NULL
     OR pg_catalog.jsonb_typeof(p_ayahs) IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_array_length(p_ayahs) < 1
     OR pg_catalog.jsonb_array_length(p_ayahs) > 286 THEN
    RAISE EXCEPTION 'Quran translation batch must contain 1 to 286 verses' USING ERRCODE = '22023';
  END IF;

  v_expected := pg_catalog.jsonb_array_length(p_ayahs);

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_ayahs) AS item(value)
    WHERE pg_catalog.jsonb_typeof(item.value) IS DISTINCT FROM 'object'
       OR COALESCE(item.value ->> 'ayah_number', '') !~ '^[1-9][0-9]*$'
       OR NULLIF(pg_catalog.btrim(item.value ->> 'text_ar'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item.value ->> 'text_en'), '') IS NULL
       OR pg_catalog.length(pg_catalog.btrim(item.value ->> 'text_en')) > 3000
  ) THEN
    RAISE EXCEPTION 'Quran translation batch contains an invalid verse payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_ayahs) AS item(value)
    GROUP BY item.value ->> 'ayah_number'
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Quran translation batch contains duplicate verse numbers' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_matched
  FROM pg_catalog.jsonb_array_elements(p_ayahs) AS item(value)
  JOIN public.quran_ayahs AS source
    ON source.surah_id = p_surah_id
   AND source.ayah_number = (item.value ->> 'ayah_number')::integer
   AND source.text_ar = item.value ->> 'text_ar';

  IF v_matched <> v_expected THEN
    RAISE EXCEPTION 'Quran Arabic source mismatch; refusing translation write' USING ERRCODE = '22023';
  END IF;

  WITH incoming AS (
    SELECT
      (item.value ->> 'ayah_number')::integer AS ayah_number,
      pg_catalog.btrim(item.value ->> 'text_ar') AS text_ar,
      pg_catalog.btrim(item.value ->> 'text_en') AS text_en
    FROM pg_catalog.jsonb_array_elements(p_ayahs) AS item(value)
  )
  UPDATE public.quran_ayahs AS target
  SET
    text_en = incoming.text_en,
    text_en_edition = p_edition,
    updated_at = pg_catalog.now()
  FROM incoming
  WHERE target.surah_id = p_surah_id
    AND target.ayah_number = incoming.ayah_number
    AND target.text_ar = incoming.text_ar
    AND NULLIF(pg_catalog.btrim(target.text_en), '') IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_sync_quran_english_batch(integer, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_quran_english_batch(integer, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.admin_sync_quran_english_batch(integer, text, jsonb) IS
  'Append-only importer for the named en.pickthall Quran translation; requires exact source verse text and never overwrites an existing translation.';
