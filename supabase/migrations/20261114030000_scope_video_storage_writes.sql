BEGIN;

-- Browser uploads are permission-checked by the video upload route. The signed upload
-- path is always prefixed with the authenticated profile ID. No browser route uses the
-- legacy public-assets bucket; owner/dashboard maintenance continues through service_role.
DROP POLICY IF EXISTS public_assets_admin_write ON storage.objects;

-- Video object replacement and deletion must remain server-only. The retention worker
-- and any future purge flow use service_role only after their reference and retention
-- checks; authenticated browser clients must not bypass those controls.
DROP POLICY IF EXISTS video_assets_admin_insert ON storage.objects;
DROP POLICY IF EXISTS video_assets_admin_update ON storage.objects;
DROP POLICY IF EXISTS video_assets_admin_delete ON storage.objects;

-- No authenticated INSERT policy is recreated. The step-up-protected admin
-- route mints service-role signed upload URLs after recording the audit event.

COMMIT;
