-- Reconciliation marker for the already-applied remote migration version 20261121060558.
-- Its canonical, replayable implementation is retained at:
-- 20261121070000_expand_video_template_assets.sql
-- Keep this marker schema-neutral so Preview does not re-apply historical DDL
-- under the remote version. Fresh previews receive the canonical implementation
-- from the later 20261121070000 migration.
SELECT 1;
