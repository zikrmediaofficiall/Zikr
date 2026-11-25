-- Reconciliation marker for the already-applied remote migration version 20261121060604.
-- Its canonical, replayable implementation is retained at:
-- 20261121080000_enable_safe_qa_failed_video_asset_deletion.sql
-- Keep this marker schema-neutral so Preview does not re-apply historical DDL
-- under the remote version. Fresh previews receive the canonical implementation
-- from the later 20261121080000 migration.
SELECT 1;
