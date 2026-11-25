# OMNIS release checklist (P14-03)

The ledger stays open: closing it needs a live Preview, then Staging, then production, each with a human approval. Supabase Preview is always "skipped" in this project, so the Preview and ledger-SHA gates cannot be met from the branch. This list is what the owner runs when merging PR 486 himself.

## Before the merge
1. Read CI on the PR head SHA: Quality Gate and Android build green.
2. Take a `pg_dump` (the project is on the Free plan with no managed backups). Check the file with `node scripts/restore-drill.mjs <dump.sql>`.
3. Review each unapplied migration file in `supabase/migrations/` dated 20261125 (160000 to 220000). All add tables or columns only.
   - Do NOT apply `20261125210000` (source gate). The owner decided to keep the source gate off (Telegram message 18033743).
4. Apply migrations to a scratch or branch database first when one exists, never directly to production as the first run.

## After the merge, in order
1. Deploy. Check `/api/health` and the home page.
2. Apply the migrations the owner approves, one at a time, checking `/admin/omnis/database` after each.
3. Flags stay off until the owner turns one on: `EDITORIAL_SOD_ENFORCED`, `AUTOMATION_ENGINE_ENABLED` (with `AUTOMATION_KILL_SWITCH`), `OMNIS_AGENTS_ENABLED`, `CUSTOM_PAGES_ENABLED`, `SOURCE_TEXT_CHECK_ENABLED`.
4. Theme: `/admin/omnis/experience` changes nothing until a theme is saved; "default" restores the original palette.
5. Rollback: revert the merge commit; migrations are additive, so reverting code leaves them unused.

## What stays human
- Approving each migration, each flag, any push sender, and the final ledger closure.
