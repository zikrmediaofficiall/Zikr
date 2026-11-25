# Backup, recovery and rollback runbook (OMNIS P12-03)

Scope: what the repository can restore on its own, and what must be confirmed in the provider dashboards. Items marked CONFIRM are not verifiable from the repo and must be checked by the owner.

## 1. What is recoverable from git and CI

| Asset | Recovery path | Source |
| --- | --- | --- |
| Application code | Redeploy a previous commit | `.github/workflows/release-vercel.yml` (manual release), Vercel deployment list |
| Database schema | Replay `supabase/migrations` in order | `pnpm supabase:migrations:check`, `.github/workflows/reconcile-supabase-migration-history.yml` |
| Quran tafsir seed data | Idempotent restore (ON CONFLICT DO UPDATE), safe to run twice | `.github/workflows/supabase-restore-seed-data.yml` (needs secret `SUPABASE_DB_URL`) |
| Android release assets | Guarded recovery dispatch | `.github/workflows/dispatch-android-release-recovery.yml` |
| Admin settings | Version history table | migration `20261125064252_zikr_admin_setting_versions.sql` |

## 2. Site rollback (code)

1. Open the Vercel project deployments and promote the last known good production deployment, or run the manual release workflow on the previous tag.
2. Do not delete environment variables during an incident: sensitive values cannot be read back.
3. Run `.github/workflows/supabase-production-health.yml` after the rollback to confirm the site and database respond.

## 3. Data recovery (database)

- The project runs on the Supabase Free plan (see `docs/SUPABASE_FREE_MIGRATION_FINAL_2026-09-29.md`). CONFIRM in the Supabase dashboard whether any automatic backup or point-in-time recovery exists on the current plan. Assume NO managed backup until confirmed.
- Until confirmed, take a manual logical dump before any risky migration: `pg_dump` with `SUPABASE_DB_URL` (non-pooling), stored outside the repo and outside the same Supabase project.
- User-generated tables (profiles, favorites, kids progress, audit log) are not reproducible from git. They are the data at risk.

## 4. Restore drill (run quarterly, record the date here)

1. Create a scratch Supabase project.
2. Replay migrations, then run the seed restore workflow against it.
3. Load the latest manual dump and compare row counts of the user tables.
4. Record the result below. Last drill: NEVER RUN (no record found).

## 5. Incident steps

1. Freeze admin publishing: revoke `content.publish` from non-owner roles.
2. Roll back code (section 2) if the fault is in a release.
3. Check the admin audit log for what changed and who changed it.
4. Restore data only from a verified dump, into a scratch project first.
5. Write the incident outcome into this file.
