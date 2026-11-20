BEGIN;

-- Keep public published reads for anonymous clients while avoiding duplicate
-- permissive SELECT policies for authenticated users. Authenticated users keep
-- the same public read and admins retain access to unpublished sections.
ALTER POLICY prophet_sections_public_read
  ON public.prophet_sections
  TO anon;

ALTER POLICY admin_all_prophet_sections_select
  ON public.prophet_sections
  USING (
    private.is_admin_user()
    OR EXISTS (
      SELECT 1
      FROM public.prophets AS prophet
      WHERE prophet.id = prophet_sections.prophet_id
        AND prophet.published IS TRUE
    )
  );

-- Support the nullable FK's ON DELETE SET NULL lookup. The target table is
-- currently tiny, so the ordinary transactional index build is appropriate.
CREATE INDEX IF NOT EXISTS site_audio_upload_intents_asset_id_idx
  ON public.site_audio_upload_intents (asset_id);

COMMIT;
