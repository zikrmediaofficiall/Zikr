-- Support the site_audio_assets(asset_id) ON DELETE SET NULL foreign key.
-- Without a referencing-column index, deleting an asset scans the complete
-- upload-intent table and becomes progressively more expensive as intents grow.

BEGIN;

CREATE INDEX IF NOT EXISTS site_audio_upload_intents_asset_id_idx
  ON public.site_audio_upload_intents (asset_id);

COMMIT;
