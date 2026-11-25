# Applying the admin migrations (owner-run)

1. Backup first (Free plan has no managed backups):
   `pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f zikr-before-admin.dump`
   (connection string: Supabase dashboard > Connect > Session pooler). The DB is about 99 MB.
2. Paste `apply-admin-migrations.sql` into the SQL editor and run it once. It is one transaction.
3. Run `verify-admin-migrations.sql` and compare with the expected counts in its comments.
4. Only then turn on features one at a time with their env flags (AUTOMATION_ENGINE_ENABLED, OMNIS_AGENTS_ENABLED, CUSTOM_PAGES_ENABLED, EDITORIAL_SOD_ENFORCED). Nothing is required to merge.
5. Rollback: `rollback-admin-migrations.sql` (only while the tables are empty), or restore the dump.

Not included: 20261125210000 (source gate, off by owner decision) and 20261125160000 (optional reciter English names data update).
