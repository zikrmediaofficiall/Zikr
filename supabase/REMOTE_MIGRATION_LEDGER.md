# Supabase Remote Migration Ledger
> **Current-project notice (2026-11-16):** Repository configuration and the connected Supabase project point to zqtssvlvmkzeeyqghqfk (Zikrofficial). Historical entries below that reference nmdeazfmtncelykzxkhs and 418/448 migration counts describe an earlier configured project snapshot and are not current state. The latest read-only snapshot is appended at the end. Historical records are retained unchanged.


This file records migrations applied directly to the live ZIKR Supabase project during the 2026-09-19 cleanup/rebuild pass.

| Remote version | Name | Purpose |
|---|---|---|
| 20260919021149 | content_catalog_phase2_20260919 | Adds and normalizes content-category catalogues for articles, duas, videos and tawasheeh. |
| 20260919021225 | editorial_expansion_phase2b_20260919 | Adds the phase-2 original editorial article set. |
| 20260919021236 | story_expansion_phase2_20260919 | Adds the original ethical-fiction story set with explicit fiction metadata. |
| 20260919021330 | kids_content_expansion_phase2d_20260919 | Adds the expanded family-friendly kids content set and publishes it safely. |
| 20260919021452 | cleanup_subscription_legacy_column_20260919 | Removes the unused legacy `verificationtoken` column after confirming zero rows used it. |
| 20260919050125 | remove_redundant_nonunique_indexes | Removes exact redundant non-unique indexes where an equivalent UNIQUE index already provides the same key coverage. |
| 20260919050332 | remove_redundant_prefix_indexes | Removes zero-scan non-unique prefix indexes fully covered by longer active indexes. |
| 20260919044739 | retire_orphaned_legacy_tables | Retires audited, empty legacy runtime tables; later local history keeps the remote version as a reconciliation marker. |
| 20260919045742 | retire_orphaned_legacy_tables | Records the idempotent legacy-table cleanup applied while reconciling the live migration history. |
| 20260919060000 | retire_orphaned_legacy_tables | Records the canonical repository migration that retains the same safe cleanup in local history. |
| 20260919065535 | quran_supabase_storage_20260919100000 | Adds the canonical `quran-audio` Storage bucket metadata and deterministic targets for the 114-surah × 7-reciter library. |
| 20260929025052 | quran_schema_compatibility_20260929 | Reconciles the remote migration history with the repository after the compatibility migration was already applied to the live project. The local marker is intentionally idempotent and does not replay production schema changes. |

## Operational rules

- The live database is the source of truth for the remote migration ledger.
- Historical migration/archive files are not deleted merely to reduce file count; they are retained when they provide audit history.
- New runtime code must use canonical environment names and the current `src/` feature architecture.
- Content migrations must be idempotent where practical and must not fabricate Quran, hadith or historical attributions.
- When a future local migration replay is required, generate the SQL from a fresh schema/content snapshot rather than inventing historical migration bodies.

Last updated: 2026-10-02.


Validation note: the rebuild branch is being validated through GitHub Actions after schema/type compatibility fixes. No production-success claim is made until the current quality gate and deployment are green.
- **20261001214711 — kids_games_schema_reconciliation_20261002**
  - Applied to production on 2026-10-02.
  - Reconciles the 20260929 kids-game schema regression with the canonical generated Supabase types.
  - Restores atomic/idempotent game-result processing, achievement catalog integrity, progress uniqueness, and the 12-game catalog.
- **20261001221622 — kids_games_enhanced_content**
  - Applied to production on 2026-10-02 as a schema-neutral migration-history reconciliation marker.
  - Replaced the legacy 8-digit `20260929` history entry so hosted Supabase migration ordering no longer collides with 14-digit `20260929xxxxxx` versions.
  - The original enhanced-content SQL is preserved under `supabase/legacy_migrations/` for audit/history reference.

## Phase 4 reconciliation addendum — 2026-10-02

A live-versus-repository reconciliation was completed against the production migration history.

| Metric | Result |
|---|---:|
| Repository migrations | 291 |
| Remote migration history entries | 291 |
| Local-only versions | 0 |
| Remote-only versions | 0 |
| Duplicate version IDs | 0 |
| Shared version IDs | 291 |
| Exact descriptive-name matches | 288 |
| Historical descriptive-name mismatches | 3 |

The three historical naming differences are:

- **20261001221622** — repository file `kids_games_history_repair`; remote name `kids_games_enhanced_content`. This is the schema-neutral migration-history reconciliation marker. The original enhanced-content SQL remains under `supabase/legacy_migrations/`.
- **20261002054010** — repository file `finish_rls_overlap_cleanup_20261002`; remote name `20261002120000_finish_rls_overlap_cleanup_20261002`. The repository commit explicitly aligned the migration timestamp history.
- **20261002054042** — repository file `finish_admin_public_policy_merge_20261002`; remote name `20261002130000_finish_admin_public_policy_merge_20261002`. The repository commit explicitly aligned the migration timestamp history.

These are descriptive-name differences for versions that exist on both sides. No migration repair is required.

Repeated descriptive names elsewhere in the history are also not duplicate version IDs; each repeated name maps to distinct migration versions.

The repository's `scripts/validate-migrations.mjs` remains the canonical local replay validator. This phase did not mutate production migration history or schema.

Last reconciled: 2026-10-02.

- **20261002073929 — phase6_security_hardening_20261002**
  - Applied to production on 2026-10-02.
  - Revokes anonymous DML privileges from the public schema while preserving the public contact-form insert path.
  - Removes Data API table privileges for `admin_audit_log`, `admin_settings`, `content_revisions`, `video_automation_runs`, and `youtube_sync_state` from `anon` and `authenticated`; service-role access remains available for server/worker paths.

- **20261002113000** — `scheduler_hardening_20261002`
  - Applied to production in Phase 13 to pin active cron endpoints to the canonical Supabase project URL.
- **20261002114000** — `retire_dead_media_cleanup_cron_20261002`
  - Applied to production in Phase 13 to retire the cron job targeting an undeployed media-cleanup Edge Function.



## Phase 5 migration-history reconciliation — 2026-10-08

The live Supabase project exposed five remote migration versions that were not present in the repository migration directory. These entries were already applied to production through the previous control-plane repair pass, so the correct fix is history reconciliation markers, not replaying the DDL.

| Remote version | Remote name | Local canonical implementation |
|---|---|---|
| 20261008014118 | repoint_production_cron_to_current_project_v2 | 20261008050000_repoint_production_cron_to_current_project.sql |
| 20261008015328 | retire_obsolete_cleanup_cron | 20261008060000_retire_obsolete_cleanup_cron.sql |
| 20261008015449 | content_translation_queue | 20261003090000_content_translation_queue.sql |
| 20261008015452 | content_library_summary_en | 20261004190000_content_library_summary_en.sql |
| 20261008015534 | harden_translation_queue_and_kids_timestamp_helpers | 20261008070000_harden_translation_queue_and_kids_timestamp_helpers.sql |

The five new files under supabase/migrations/ are schema-neutral SELECT 1 markers keyed to the remote version IDs. They exist solely so the managed Supabase migration workflow can resolve the remote-history check without replaying already-applied production changes.

The remaining repository-only migrations are intentionally preserved as forward migrations and are not deleted or renamed in this reconciliation.

Last reconciled: 2026-10-08.


## Phase 6 migration-history reconciliation — 2026-11-06

The Supabase production migration history returned two additional versions for the internal video queue constraint update. The repository already contains the canonical schema-changing migration at `20261106160000_allow_internal_videos_in_content_publish_queue.sql`. These two remote versions are represented locally by schema-neutral markers so preview/development branches can reproduce the exact migration ledger without replaying extra production DDL.

| Remote version | Remote name | Local reconciliation file | Operation |
|---|---|---|---|
| 20261106184415 | allow_internal_videos_in_content_publish_queue | `20261106184415_allow_internal_videos_in_content_publish_queue.sql` | `SELECT 1` marker only |
| 20261106184600 | allow_internal_videos_in_content_publish_queue | `20261106184600_allow_internal_videos_in_content_publish_queue.sql` | `SELECT 1` marker only |

The canonical constraint change remains in the existing `20261106160000` migration. These markers do not change schema, rows, queue contents, or external publishing behavior. Do not delete or rewrite the existing migration files.

This reconciliation is based on the live production migration list captured on 2026-11-06. The active project reports 403 migration entries, matching the repository chain in this release branch. The project has one default `main` branch and no preview branches.

Last reconciled in repository: 2026-11-06 (including private likes and trigger-maintained public aggregates).


## Active project cutover — 2026-11-06

The production binding has moved to Supabase project `zqtssvlvmkzeeyqghqfk` (organization `Zikrofficial`, region `eu-west-2`). This supersedes `ymxdswkaxafakugktsim` as the active application target. Historical migration bodies and dated audit snapshots retain the old reference as historical evidence; active configuration, workers, CI, and release validation must use the new project.

| Version | Migration | Status |
|---|---|---|
| 20261106205519 | `revoke_public_execution_on_rls_auto_enable` | Applied to active project; anon/authenticated execution revoked, postgres-owned `ensure_rls` event trigger remains enabled. |
| 20261106210440 | `repoint_active_cron_jobs_to_current_project` | Applied to active project; active prayer/source-agent cron jobs target the canonical Supabase host. |
| 20261106210520 | `repoint_active_cron_jobs_to_current_project` | Applied as a no-op reconciliation marker for the exact remote migration ledger. |
| 20261106213918 | `video_likes` | Applied to active project; authenticated users can add/remove their own likes. Public totals are exposed only through an RLS-protected count table. |
| 20261106214309 | `secure_video_like_count_summary` | Applied to active project; like totals are maintained by a trigger-only function whose EXECUTE privilege is revoked from public roles. |

The active project snapshot contained 400 migrations before this cutover; the security migration, both cron migration versions, and the video likes migration are now applied, bringing the live ledger to 405 entries. Public schema RLS was enabled on all 90 inspected tables. Health Advisor had no findings. The remaining Security Advisor warning is the Supabase Auth leaked-password protection setting, which is unavailable on the current Free plan.

Do not rewrite old migration SQL or historical snapshots to make their former project URLs appear current. New forward migrations and current runtime configuration must use the active project reference.


## 2026-11-14T1150Z live migration and schema comparison — read-only

- Supabase project `zqtssvlvmkzeeyqghqfk`: 439 local migrations, 418 remote, 21 local-only, 0 remote-only, 0 duplicate local versions. No migration was pushed or applied.
- Pending local-only migrations:
- `supabase/migrations/20261110212000_kids_content_public_read_respects_active_state.sql`
- `supabase/migrations/20261111000000_revoke_anon_public_admin_predicate.sql`
- `supabase/migrations/20261111003000_expand_kids_content_supported_types.sql`
- `supabase/migrations/20261111010000_background_reminders_respect_quiet_hours_timezone.sql`
- `supabase/migrations/20261111020000_admin_role_update_blocks_self_demotion.sql`
- `supabase/migrations/20261111030000_prophet_sections_public_read_requires_published_parent.sql`
- `supabase/migrations/20261111040000_kids_game_levels_require_published_game.sql`
- `supabase/migrations/20261111050000_admin_role_assignments_service_role_only.sql`
- `supabase/migrations/20261111153000_harden_video_storage_retention_rpc.sql`
- `supabase/migrations/20261111170000_kids_game_questions_require_published_parent.sql`
- `supabase/migrations/20261112103200_revoke_client_non_dml_table_privileges.sql`
- `supabase/migrations/20261113000000_background_reminder_intervals_allow_disabled.sql`
- `supabase/migrations/20261113190000_harden_admin_managed_content_write_permissions.sql`
- `supabase/migrations/20261113200000_youtube_sync_state_playlist_cache.sql`
- `supabase/migrations/20261113210000_reconcile_source_agent_cron_project_ref.sql`
- `supabase/migrations/20261113220000_remove_direct_site_audio_storage_write_policies.sql`
- `supabase/migrations/20261113230000_content_publish_queue_one_active_item.sql`
- `supabase/migrations/20261114000000_site_audio_upload_intents.sql`
- `supabase/migrations/20261114010000_social_publish_queue_target_platform_contract.sql`
- `supabase/migrations/20261114020000_revoke_client_default_function_execute.sql`
- `supabase/migrations/20261114030000_scope_video_storage_writes.sql`
- Missing production contracts: `site_audio_upload_intents`; `background_reminder_preferences.timezone`; `youtube_sync_state.playlists`; `social_publish_queue_target_platforms_check`; `content_publish_queue_one_active_item` partial unique index. Existing social target arrays have zero invalid rows; active content-publish queue has zero duplicate pairs; background reminder preferences currently have zero rows.
- Live RLS still permits direct authenticated admin writes to `kids_content`, `videos`, `video_generation_requests`, `social_publish_queue`, and `site_audio_assets`; `admin_role_assignments` still has super-admin direct writes. Kids public-read policy checks `published=true` but not `is_active=true`. Storage still has direct site-audio, video-assets, and legacy public-assets admin policies. Pending migrations harden these; none was applied.
- Default function ACLs still grant EXECUTE to `anon` and `authenticated` for defaults owned by `postgres` in `public`/`storage` and `supabase_admin` in `graphql`/`graphql_public`/`public`. The specific Kids share-count function is already service-role-only.
- Baseline production contracts verified read-only: `kids_games`, `kids_content`, `content_library`, `content_translation_queue`, and `admin_rate_limits` exist; `content_library.summary_en` exists; anon cannot SELECT `content_translation_queue`; service_role can read `admin_rate_limits`.
- Kids data: 65 rows, all published and active; 35 games, 3 quizzes, 26 stories, 1 wudu item. Every row has an age_group; 20 of 26 stories lack explicit `metadata.age_appropriate=true` and require editorial review. No data was edited.
- Supabase Advisors: Health clean; Security leaked-password protection disabled; Performance 79 unused-index INFO findings. No indexes were removed.
- SQL-only RLS, default-ACL, CHECK-constraint, and partial-index review remains owner-only. No production database, policy, index, function, or storage object was mutated.


## 2026-11-14T1157Z production migration/schema comparison — read-only

- Project `zqtssvlvmkzeeyqghqfk`: 439 local migrations, 418 remote, 21 local-only, 0 remote-only, 0 duplicate local versions. No migration was pushed or applied.
- The 21 local-only migrations are recorded in the immediately preceding migration ledger entry; all remain pending owner review and apply.
- Missing live contracts: `site_audio_upload_intents`; `background_reminder_preferences.timezone`; `youtube_sync_state.playlists`; `social_publish_queue_target_platforms_check`; `content_publish_queue_one_active_item` partial unique index. Existing social target arrays have zero invalid rows; active publish queue has zero duplicate pairs; background reminder preferences currently has zero rows.
- Direct admin RLS writes remain on Kids/video/social/site-audio tables; `admin_role_assignments` still permits super-admin direct writes; Kids public-read policy lacks `is_active=true`; direct site-audio/video/public-assets storage policies remain. Default function ACLs still grant EXECUTE to client roles for defaults owned by postgres/supabase_admin. Kids share-count function itself is service-role-only.
- Baseline tables/columns and anon denial for `content_translation_queue` were verified read-only. Kids live data: 65 rows all active/published; 35 games, 3 quizzes, 26 stories, 1 wudu item; all have age_group, but 20 stories lack explicit `metadata.age_appropriate=true`. No data edited.
- Supabase Advisors: Health clean; Security leaked-password protection disabled; Performance 79 unused-index INFO findings. No indexes or production resources were deleted.

## Read-only refresh — 2026-11-14, code/test head `f9346878b80e0b645eb72a30e92abb5c6134bf10`

Remote project: `zqtssvlvmkzeeyqghqfk`.

- Local SQL migration files: **440**
- Remote `supabase_migrations.schema_migrations` rows: **418**
- Local-only / unapplied versions: **22**
- Latest remote version: `20261110170000`
- Comparison method: read-only migration inventory. No `db push`, `migration up`, direct SQL write, or production mutation was executed.

The following local-only migrations remain owner-review and production-approval blockers:

- `supabase/migrations/20261110212000_kids_content_public_read_respects_active_state.sql`
- `supabase/migrations/20261111000000_revoke_anon_public_admin_predicate.sql`
- `supabase/migrations/20261111003000_expand_kids_content_supported_types.sql`
- `supabase/migrations/20261111010000_background_reminders_respect_quiet_hours_timezone.sql`
- `supabase/migrations/20261111020000_admin_role_update_blocks_self_demotion.sql`
- `supabase/migrations/20261111030000_prophet_sections_public_read_requires_published_parent.sql`
- `supabase/migrations/20261111040000_kids_game_levels_require_published_game.sql`
- `supabase/migrations/20261111050000_admin_role_assignments_service_role_only.sql`
- `supabase/migrations/20261111153000_harden_video_storage_retention_rpc.sql`
- `supabase/migrations/20261111170000_kids_game_questions_require_published_parent.sql`
- `supabase/migrations/20261112103200_revoke_client_non_dml_table_privileges.sql`
- `supabase/migrations/20261113000000_background_reminder_intervals_allow_disabled.sql`
- `supabase/migrations/20261113190000_harden_admin_managed_content_write_permissions.sql`
- `supabase/migrations/20261113200000_youtube_sync_state_playlist_cache.sql`
- `supabase/migrations/20261113210000_reconcile_source_agent_cron_project_ref.sql`
- `supabase/migrations/20261113220000_remove_direct_site_audio_storage_write_policies.sql`
- `supabase/migrations/20261113230000_content_publish_queue_one_active_item.sql`
- `supabase/migrations/20261114000000_site_audio_upload_intents.sql`
- `supabase/migrations/20261114010000_social_publish_queue_target_platform_contract.sql`
- `supabase/migrations/20261114020000_revoke_client_default_function_execute.sql`
- `supabase/migrations/20261114030000_scope_video_storage_writes.sql`
- `supabase/migrations/20261114040000_save_default_prayer_location_atomically.sql`

The atomic prayer-location migration `20261114040000_save_default_prayer_location_atomically.sql` is included in the local-only list. The API route now calls this RPC, so production deployment must not precede the approved migration application.


## 2026-11-14T1357Z — live contract and advisor refresh (read-only)

- Production migration history: 418 remote versions, latest `20261110170000`; local repository: 440 migrations; 22 local-only pending; zero remote-only and zero duplicate local versions.
- Catalog checks returned NULL for `to_regclass('public.site_audio_upload_intents')` and `to_regprocedure('public.save_default_prayer_location(text,text,numeric,numeric,text)')`. Both contracts are absent in production; the associated route changes must not be released until their migrations are reviewed and applied.
- Active production Edge Functions: `source-verified-content-agent` v14, `prayer-notification-worker` v77, `spiritual-ai` v2, `health` v2. Local Deno checks passed all four entrypoints; no deployment occurred.
- Advisor snapshot: health clean; one `auth_leaked_password_protection` security warning; 78 unused-index notices. No index was removed or altered.
- The 22 local-only migrations remain owner-review gated. No DDL or data mutation was performed.


## 2026-11-14T1421Z — live contract and advisor refresh (read-only)

- Production migration history: 418 remote versions, latest `20261110170000`; local repository: 440 migrations; 22 local-only pending; zero remote-only and zero duplicate versions.
- Catalog checks returned NULL for `to_regclass('public.site_audio_upload_intents')` and `to_regprocedure('public.save_default_prayer_location(text,text,numeric,numeric,text)')`. Both contracts are absent in production; the associated route changes must not be released until their migrations are reviewed and applied.
- Active production Edge Functions: `source-verified-content-agent` v14, `prayer-notification-worker` v77, `spiritual-ai` v2, `health` v2. Local Deno checks passed all four entrypoints; no deployment occurred.
- Advisor snapshot: health clean; one `auth_leaked_password_protection` security warning; 78 unused-index notices. No index was removed or altered.
- The 22 local-only migrations remain owner-review gated. No DDL or data mutation was performed.


## 2026-11-14T1443Z — live contract and advisor refresh (read-only)

- Production migration history: 418 remote versions, latest `20261110170000`; local repository: 440 migrations; 22 local-only pending; zero remote-only and zero duplicate local versions.
- Catalog checks returned NULL for `to_regclass('public.site_audio_upload_intents')` and `to_regprocedure('public.save_default_prayer_location(text,text,numeric,numeric,text)')`. Both contracts are absent in production; the associated route changes must not be released until their migrations are reviewed and applied.
- Active production Edge Functions: `source-verified-content-agent` v14, `prayer-notification-worker` v77, `spiritual-ai` v2, `health` v2. Local Deno checks passed all four entrypoints; no deployment occurred.
- Advisor snapshot: health clean; one `auth_leaked_password_protection` security warning; 78 unused-index notices. No index was removed or altered.
- The 22 local-only migrations remain owner-review gated. No DDL or data mutation was performed.

## 2026-11-14 — current remote/local reconciliation (read-only)

- Connected Supabase organization: `Zikrofficial`, plan `free`; project `zqtssvlvmkzeeyqghqfk` is `ACTIVE_HEALTHY` on PostgreSQL `17.11.0.018`.
- Live `supabase_migrations.schema_migrations`: **418** unique versions; latest `20261110170000`.
- Local audit branch at code/test head `bc1f0dd9fc9a0d324221633569ea45ae034757e8`: **441** migration files, 441 unique versions, zero duplicate versions; **23 local-only pending**, zero remote-only. No migration was pushed to production.
- Local-only pending versions:
  - `20261110212000`
  - `20261111000000`
  - `20261111003000`
  - `20261111010000`
  - `20261111020000`
  - `20261111030000`
  - `20261111040000`
  - `20261111050000`
  - `20261111153000`
  - `20261111170000`
  - `20261112103200`
  - `20261113000000`
  - `20261113190000`
  - `20261113200000`
  - `20261113210000`
  - `20261113220000`
  - `20261113230000`
  - `20261114000000`
  - `20261114010000`
  - `20261114020000`
  - `20261114030000`
  - `20261114040000`
  - `20261114100000`
- Live Storage metadata: `videos.file_size_limit = 536870912` (512 MiB); `android-releases.file_size_limit = 52428800` (50 MiB). The connected organization is on the Free plan and the repository's global Storage default is 50 MiB. The existing Android release bucket migration and the 2026-10-09 413 incident record establish the 50 MiB project ceiling.
- Audit repair: `20261114100000_videos_bucket_free_tier_limit.sql` aligns the existing `videos` bucket to 50 MiB. API validation, storage purpose contract, admin upload field and local Supabase config are aligned to the same ceiling. This forward migration is local-only and remains pending owner approval.
- No production SQL was executed beyond read-only SELECTs; no bucket setting was changed, no object or media was deleted, and no upload was performed.


## 2026-11-14 read-only production contract preflight — code/test head 96c36d5e5bff32d8f8283643f09606fbea5dc005

### Migration inventory

- Live project: `zqtssvlvmkzeeyqghqfk`, status ACTIVE_HEALTHY.
- Remote migration versions: 418.
- Repository migration files: 441.
- Local-only pending versions: 23.
- Remote-only versions: 0.
- Latest remote version: `20261110170000`.
- No migration was applied during this audit.

Pending local migrations (all reviewed from their actual SQL contents):

1. `20261110212000_kids_content_public_read_respects_active_state.sql`
2. `20261111000000_revoke_anon_public_admin_predicate.sql`
3. `20261111003000_expand_kids_content_supported_types.sql`
4. `20261111010000_background_reminders_respect_quiet_hours_timezone.sql`
5. `20261111020000_admin_role_update_blocks_self_demotion.sql`
6. `20261111030000_prophet_sections_public_read_requires_published_parent.sql`
7. `20261111040000_kids_game_levels_require_published_game.sql`
8. `20261111050000_admin_role_assignments_service_role_only.sql`
9. `20261111153000_harden_video_storage_retention_rpc.sql`
10. `20261111170000_kids_game_questions_require_published_parent.sql`
11. `20261112103200_revoke_client_non_dml_table_privileges.sql`
12. `20261113000000_background_reminder_intervals_allow_disabled.sql`
13. `20261113190000_harden_admin_managed_content_write_permissions.sql`
14. `20261113200000_youtube_sync_state_playlist_cache.sql`
15. `20261113210000_reconcile_source_agent_cron_project_ref.sql`
16. `20261113220000_remove_direct_site_audio_storage_write_policies.sql`
17. `20261113230000_content_publish_queue_one_active_item.sql`
18. `20261114000000_site_audio_upload_intents.sql`
19. `20261114010000_social_publish_queue_target_platform_contract.sql`
20. `20261114020000_revoke_client_default_function_execute.sql`
21. `20261114030000_scope_video_storage_writes.sql`
22. `20261114040000_save_default_prayer_location_atomically.sql`
23. `20261114100000_videos_bucket_free_tier_limit.sql`

### Missing production schema/function contracts

Read-only catalog checks found these contracts absent:

- Column `public.background_reminder_preferences.timezone`.
- Column `public.youtube_sync_state.playlists`.
- Table `public.site_audio_upload_intents`.
- RPC `public.save_default_prayer_location(text,text,double precision,double precision,text)`.
- RPC `public.admin_update_user_role(uuid,uuid,text,text)`.
- RPC `public.video_storage_retention_contract_ready()`.
- RPC `public.update_video_storage_retention(uuid,jsonb)`.

The older `public.plan_background_reminder_deliveries(timestamptz)` function exists, but its deployed definition predates the local timezone-aware planner migration. Application routes/actions that depend on the missing contracts must not be deployed before owner-reviewed migration application and post-apply verification.

### Current production RLS/Storage findings

- `kids_content_public_read` currently permits anonymous SELECT using only `published = true`. A read-only count found 20 published, active story rows whose `metadata.age_appropriate` is absent or not true. These rows are reachable through direct anonymous Supabase REST despite application-level filtering. Migration `20261110212000` fixes the policy; no content rows were edited.
- `kids_game_questions_public_read` permits anonymous SELECT of published rows, including the `correct_index` answer-key column. There are currently 0 published question rows, so the issue is latent, but the policy is unsafe for future publication. Migration `20261111170000` removes public table reads.
- `kids_game_levels_public_read` checks level publication but not parent-game publication. Current count of published levels under unpublished games is 0; migration `20261111040000` adds the parent condition.
- Production Storage still has `video_assets_admin_insert`, `video_assets_admin_update`, and `video_assets_admin_delete` policies whose predicate uses `profiles.role = 'admin'` without the intended owner-prefix/role-assignment restrictions. This allows direct browser writes to bypass the audited step-up signed-upload route. Migration `20261114030000` removes these policies.
- Production Storage still has `site_audio_admin_insert` and `site_audio_admin_delete` policies using `private.is_admin_user()`; this is limited to full admins but bypasses the upload-intent/audit path. Migration `20261113220000` removes these policies.
- `public_assets_admin_write` remains on the public `public-assets` bucket; no application consumer was found. Migration `20261114030000` removes the legacy write policy.
- The production videos bucket has a 512 MiB per-object limit; local migration `20261114100000` lowers it to 50 MiB to match the application cap. No bucket configuration or object was changed.
- `site_audio_assets` and `social_sync_jobs` have RLS enabled; `social_sync_jobs_client_denied` denies browser access. `site_audio_upload_intents` does not exist until migration application.

### Background jobs and deployed Edge Functions

- Active cron jobs: `zikr-prayer-push-dispatch` (every minute), `zikr-source-verified-content-agent` (daily), and `zikr-cron-history-cleanup` (daily).
- `zikr-youtube-facebook-sync` is inactive. No media-cleanup cron is present.
- Deployed Edge Functions: `prayer-notification-worker` v77, `source-verified-content-agent` v14, `spiritual-ai` v2, and `health` v2. No `cleanup-youtube-facebook-media` function is deployed.
- Deployed prayer-worker v77 contains an older single-file implementation and lacks the repository's current pagination, push-endpoint validation, timezone and delivery-lease helpers. Deployed source-agent v14 lacks the repository parser module; its inline parser returns no items. These are deployment-drift findings; no function was deployed.
- The legacy Next route `/api/internal/youtube-facebook/cleanup-media` is unscheduled, and its `youtube-facebook-media` bucket is absent. The sync cron is inactive. No cleanup was run.

### Advisor state and safety

- Security advisor: leaked-password protection disabled; owner-side Auth setting.
- Performance advisor: 78 unused-index notices. No indexes were dropped.
- Health advisor: no lints.
- This was read-only inspection. No production DDL/DML, Storage object mutation, content generation, Gemini call, social publish, secret change or release was performed.

## 2026-11-14 mobile/Capacitor repository reconciliation — code/test head 47b35b7598f5287c97f07dcde623359060966e04

- Android package uses `@capgo/capacitor-social-login` 7.20.0 for native Google login. The committed `android/capacitor.settings.gradle` previously had stale Capacitor 7.4.3 pnpm paths and omitted the social-login Gradle project even though `MainActivity` references its plugin. The debug workflow's `cap sync` regenerated the correct project and had masked this repository drift.
- Fixed the tracked generated files to match lockfile Capacitor core 7.6.9/platform 7.6.10 and plugin 7.20.0; added the app dependency; the readiness verifier and native OAuth regression test assert exact lockfile paths; the Android workflow now fails if `cap sync` changes either committed Gradle file.
- Final verification: Quality Gate `43643147440` success; Android Debug APK `43643147491` success including post-sync diff check; CircleCI config validation `43643147495` success and required CircleCI contexts success. Debug artifact only; no release.
- iOS deliberately uses HTTPS PKCE through the system browser; the Android-only SocialLogin plugin is not required in the iOS Podfile. Xcode project has no `DEVELOPMENT_TEAM`; the AASA route requires `IOS_ASSOCIATED_DOMAIN_APP_ID`. Owner must configure signing/app association and perform physical-device acceptance. The Vercel environment-variable listing was not available in this pass, so no claim is made that the AASA variable is currently configured.
- Native advertising contract was read and verified: Capacitor runtime exits before Monetag, SmartLink, GTM, Funding Choices and AdSense injection; native service-worker mode skips Monetag. The mobile ad-free verification passed in Quality Gate `43643147440`.
- No production deployment, app-store release, Gemini request, social publishing, or production data/storage mutation was triggered.

## 2026-11-15 audit checkpoint — code/test head 748ba0b563a7b5885af7f6ffde406770065675e7

- Repository inventory at the checkpoint: 444 tracked SQL migrations under `supabase/migrations`; remote migration history contains 418 versions and ends at `20261110170000`. There are **26 local-only migrations**. The new local migration `20261115070000_reconcile_prayer_push_cron_project_ref.sql` is included in that count. No migration was applied to production.
- Production cron read: `zikr-prayer-push-dispatch` has one active row, schedule `* * * * *`, and the expected canonical `https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/prayer-notification-worker` target using `public.get_push_scheduler_secret()`. `zikr-source-verified-content-agent` also has one active row and the expected canonical project URL. The new migration does not call either function; against the inspected current rows it performs no cron mutation. Duplicate-job reconciliation is tested only against a disposable local PostgreSQL 17 fixture.
- The new cron migration adds no table/data/index deletion. The content-publish-queue uniqueness migration preflights duplicate active rows and creates its partial unique index; it does not delete queue rows. No index was dropped by this audit.
- Production `public.favorite_item_type` enum values are exactly `quran, hadith, story, scholar, dua`. The Favorites UI/service now derive the TypeScript union from the same five-value runtime list, reject unsupported runtime inputs, and type the page labels against that contract. The `article`/`video` resolver cases are retained only for legacy URL resolution; those values are not accepted as database enum members.
- Supabase advisors: leaked-password protection is disabled (owner-side Auth setting); 78 unused-index notices are advisory only; no indexes were removed; health advisor returned no lints. Admin configuration read showed `require_mfa_for_destructive=false`, so destructive admin operations do not currently require step-up MFA. Owner decision required.
- Storage read: the `public-assets` bucket is public and has no configured size/MIME restriction; no application consumer was found. The SQL interface did not provide a conclusive object inventory, so no empty-bucket claim is made. The pending local storage-policy migration does not delete the bucket or objects. No storage object was changed or deleted.
- The daily `audit-video-media` workflow is a production writer despite its name: it uses the service role and compare-and-set updates to reconcile published video metadata/YouTube IDs. The audit did not dispatch it. AI video generation, social publishing, offline snapshot refresh, storage cleanup, and release workflows were not dispatched by the audit.
- The Vercel project lacks `IOS_ASSOCIATED_DOMAIN_APP_ID`; the AASA route cannot produce a valid Apple app association until the owner configures it. Android App Links SHA is present. No production deployment or release was performed from this checkpoint.
- All database and storage inspection in this section was read-only. The production cron job was not invoked; no DDL/DML, object deletion, index change, secret change, or release occurred.


## 2026-11-15T08:24Z — production migration/RLS refresh (read-only; code/test head cfaf0f6bc2d3cde9d4c8f16beebb7c4bd0898896)

- Active project: `zqtssvlvmkzeeyqghqfk`; remote migration ledger: **418** versions, latest `20261110170000`; repository: **444** migration files; **26 local-only pending**, zero remote-only. All local migrations replayed successfully in isolated PostgreSQL 17 under Quality Gate `43693587553`; no production migration was applied.
- Current live cron inventory: one active `zikr-source-verified-content-agent` job on its expected daily schedule and canonical project URL; one active `zikr-prayer-push-dispatch` job on `* * * * *` and canonical worker URL. The pending reconciliation migrations are no-ops against these inspected rows. No cron job was invoked or changed.
- Read-only RLS/data counts: 20 published Kids stories lack `metadata.age_appropriate=true` under the current published-only public policy; 0 published inactive Kids rows. Public Kids-video policy is still published-only (0 current unreviewed published Kids videos). Public `kids_game_questions` policy can expose `correct_index` (0 published question rows); Kids-level policy lacks published-parent gating (0 current orphaned published levels). Direct client writes remain broader than the service-role-only target for push subscriptions and several admin-managed tables/storage paths.
- Other preflight counts: 0 active push subscriptions; 0 invalid `social_publish_queue.target_platforms` rows; 0 duplicate active `content_publish_queue` groups. Live `videos` bucket `file_size_limit=536870912` (512 MiB), while the application limit is 50 MiB and migration `20261114100000` is pending.
- Admin setting `require_mfa_for_destructive=false`; Supabase Security Advisor reports leaked-password protection disabled; Performance Advisor reports 78 unused-index notices; Health Advisor returned no lints. No index was dropped.
- Deployed Edge Function versions: `spiritual-ai` v2, `prayer-notification-worker` v77, `source-verified-content-agent` v14. The local branch has stronger auth/body bounds, pagination/endpoint validation/delivery leases, and explicit parser-skip reporting respectively. No Edge Function was deployed.
- All statements above are based on read-only metadata/catalog/count queries. No DDL/DML, migration apply, bucket change, cron mutation, function deployment, Storage-object change, or data mutation was performed.


## 2026-11-15T16:32Z — atomic video approval migration (local-only)

- Remote migration history remains **418** versions through `20261110170000`; the repository now has **445** migration files, **27 local-only pending**, and zero remote-only versions.
- Added `supabase/migrations/20261115153600_admin_video_approval_atomic.sql` (blob SHA `6211d986167ed63ad6147fcc66051057d05c0551`). It creates the service-role-only `admin_approve_video_generation_request` RPC so the generation request and matching catalog row are locked and compare-and-set updated atomically.
- Isolated PostgreSQL 17 integration step 11 passed in Quality Gate `43735522332` on exact code/test head `37b1d8b8861ae39ea673c4386eaf2ec76fc7571a`. The test first caught ambiguous `updated_at` references caused by the PL/pgSQL output parameter; both UPDATE predicates now qualify their target aliases.
- The RPC is absent from production. This migration remains local-only and was not applied. No production schema, data, function, cron, storage, or content was changed.


## 2026-11-15 read-only migration reconciliation

- Local migration files: 445. Production `schema_migrations`: 418 applied, latest `20261110170000`; 27 local versions remain unapplied.
- New local migration `20261115153600_admin_video_approval_atomic.sql` (blob `5d9e8c9d2bb44f48d0a62a24d8b34d5d1f1f4b5a`) defines the atomic Kids video approval RPC and related contract. It is not applied in production; no production migration was executed.
- Production still lacks the video approval/retention RPC contracts, `site_audio_upload_intents`, `youtube_sync_state.playlists`, the prayer default-location function and the expected timezone/retention contract fields. Confirm each against the release checklist before owner-approved rollout.
- The 27-migration difference remains a release blocker. Use the protected release-finalization workflow and owner approval; do not use direct SQL or bypass migration history reconciliation.

## 2026-11-16 exact-head continuation — Kids public human-approval gate

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `fa045577ecc02b1b515bf62ccd949e2d34552d76`.

- PR inventory: 629 changed paths (283 added, 346 modified, 0 deleted); 99,921 additions and 6,607 deletions.
- Recursive tree: 2,446 entries (1,947 blobs, 499 directories). Self-excluding manifest: 2,443 entries. File-status overlay: 627 rows — CONTENT_READ_TESTED_PASS=412, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=169, SUPERSEDED_SNAPSHOT=8. The 169 review-required paths remain open.
- Exact-head verification: Quality Gate 43770291645 passed; CircleCI 43770291695 passed; Android Native Login Debug APK 43770291676 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Policy-only migrations `20261115170000_restrict_public_kids_video_read_to_human_approval.sql` and `20261115215300_require_human_approval_for_public_kids_videos.sql` require internal Kids rows to have a completed generation-request UUID, Cloudinary master media, source/content/template fingerprints, passed automated QA, matching snapshot hashes, a non-system UUID reviewer, timestamped human review, all five review flags and complete original-series metadata. PostgreSQL 17 integration exposes legacy/general plus one complete human-approved Kids fixture to anon/authenticated and hides automated-only, system-reviewed and incomplete-review fixtures; service_role retains full access. Production apply remains pending.
- Public Kids list/detail services now resolve the linked completed generation request and fail closed unless the catalog row and request share a current human-approval snapshot and QA/media fingerprints. The Kids social publisher also requires human approval; main still contains the older automated/system approval path until owner-approved merge and release.
- Read-only production evidence: live `videos_public_read` remains `TO public USING (published = true)`; 32 published internal Kids rows were observed with zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. The branch policy is not live.
- Read-only production social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher remains enabled; observed run reported zero approval-blocked rows. Main's `generate-ai-video.yml` is non-dry-run/auto-publish without human approval. Owner must pause the publisher or hold/reconcile nonterminal rows before merge/deploy; no publish or queue mutation was triggered.
- Main's public offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved. GitHub Actions PR-creation permission remains owner-only.
- Vercel production remains READY on `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`; audit branch not deployed. Vercel project-settings access returned 403, so Git auto-deploy/project metadata is unverified. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, index/secret change, Android/iOS release, merge or deployment occurred. Manual owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head migration reconciliation — human-approved Kids RLS

- Local migration files: 447. Production `schema_migrations`: 418 applied, latest `20261110170000`; 29 local-only pending; zero remote-only.
- `20261115170000_restrict_public_kids_video_read_to_human_approval.sql` and `20261115215300_require_human_approval_for_public_kids_videos.sql` are policy-only migrations. The second replaces the first with the complete human-review, matching-snapshot, QA, source/media and series contract. Neither was applied to production.
- PostgreSQL 17 integration applies both after the existing QA-only policy migration. Anonymous/authenticated visibility is limited to legacy/general plus one complete human-approved Kids fixture; automated-only, system-reviewed and incomplete-review fixtures are rejected; service_role retains full visibility.
- Exact code/test head `fa045577ecc02b1b515bf62ccd949e2d34552d76`: Quality Gate `43770291645`, CircleCI `43770291695`, Android Debug APK `43770291676` passed. Supabase Preview `132938540531` was skipped, not passed.
- Read-only production inspection still shows `videos_public_read TO public USING (published = true)`, 32 published internal Kids rows with zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Branch migration is not live. No production DDL/DML or migration apply occurred.
- Apply only through the protected release-finalization workflow after CODEOWNERS review, exact migration-history reconciliation, backup/rollback review and explicit owner approval.

## 2026-11-16 exact-head continuation — prayer-time parser and Kids approval

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `8019d226dc5a79b982805a428cc9a2cc6c3b8d46`.

- PR inventory: 629 changed paths (283 added, 346 modified, 0 deleted); 100,103 additions and 6,607 deletions.
- Recursive tree: 2,446 entries (1,947 blobs, 499 directories). Self-excluding manifest: 2,443 entries. File-status overlay: 627 unique rows — CONTENT_READ_TESTED_PASS=414, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=167, SUPERSEDED_SNAPSHOT=8. The 167 review-required paths remain open.
- Exact-head verification: Quality Gate 43772582149 passed; CircleCI 43772582124 passed; Android Native Login Debug APK 43772582089 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- Prayer-notification defect fixed: cached/provider prayer strings now require a valid minute field and either end-of-string or whitespace after the time. Malformed values such as `05:07malformed` fail closed; valid provider annotations such as `05:07 (EET)` remain accepted. The same parser is used when scheduling cached prayers and when revalidating queued deliveries against current cache rows, so malformed cached times cannot create or validate a reminder. Regression tests cover both cases; no notification was dispatched.
- Kids public RLS validates RFC-compatible UUID version/variant for both linked generation requests and human reviewers. PostgreSQL 17 integration covers invalid UUID versions/variants, automated-only, system-reviewed and incomplete-review fixtures. Public Kids list/detail services require a linked completed request, matching current human approval snapshot, QA and source/media fingerprints. The social publisher branch also requires human approval; production migrations and merge remain pending.
- Cleanup endpoint hardening remains: both site-audio and general Storage cleanup scripts require the exact HTTPS Supabase project host and reject ports, credentials, paths, queries and fragments. Destructive apply requires writer freeze, typed owner confirmation, live retention-RPC preflight, complete reference inventory, exact-path verification and manual dispatch. No cleanup was dispatched and no Storage object was deleted.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live `videos_public_read` remains `TO public USING (published = true)`; 32 published internal Kids rows were observed with zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Read-only social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run auto-publish workflow remain owner-controlled blockers.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Vercel production remains READY on `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`; audit branch not deployed. Vercel project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head migration reconciliation — prayer parser and Kids UUID contract

- Local migration inventory remains 447; production has 418 applied, latest `20261110170000`; 29 local-only pending; zero remote-only. The two human-approval Kids RLS migrations are policy-only and were tested in disposable PostgreSQL 17; neither was applied to production.
- Exact code/test head `8019d226dc5a79b982805a428cc9a2cc6c3b8d46`: Quality Gate `43772582149`, CircleCI `43772582124`, Android Debug APK `43772582089` passed. Supabase Preview `132938540531` was skipped.
- Prayer-time parsing now rejects malformed cached/provider strings before schedule creation and again during delivery revalidation; valid provider timezone annotations after whitespace remain accepted. No push was sent.
- Storage cleanup endpoint validation and manual destructive gates passed; no cleanup was dispatched.

## 2026-11-16 exact-head continuation — written-content Kids source reservation

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `0db217863b9465615942c9ac8fc8a2180124d4f4`.

- PR inventory: 629 changed paths (283 added, 346 modified, 0 deleted); 100,242 additions and 6,607 deletions.
- Recursive tree: 2,446 entries (1,947 blobs, 499 directories). Self-excluding manifest: 2,443 entries. File-status overlay: 627 unique rows — CONTENT_READ_TESTED_PASS=415, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=166, SUPERSEDED_SNAPSHOT=8. The 166 review-required paths remain open.
- Exact-head verification: Quality Gate 43773747800 passed; CircleCI 43773747833 passed; Android Native Login Debug APK 43773747753 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- Written-content Kids reservation regression: source metadata now treats percent-encoded, double/triple-encoded, dot-segment and malformed Kids paths as reserved; a general backfill cannot relabel those rows. Backfill source types are trimmed/case-normalized before quota and automation-key checks, and Kids payloads retain the canonical Kids source ID, audience and `/kids/` path. The test also asserts the worker uses the guard before queue insertion. No written-content generation or Gemini request was run.
- The `generate-written-content.yml` workflow is scheduled on main three times daily and explicitly enables Gemini; it remains a production side-effecting workflow. The audit branch was not dispatched. Main's 15-minute social publisher and non-dry-run video auto-publish workflow also remain owner-controlled blockers until human approval is merged/deployed and production queues are reconciled.
- Prayer-notification parser rejects malformed cached/provider times and is reused for schedule creation and delivery revalidation. Storage cleanup scripts remain exact-project-bound and manual/typed-confirmation gated; no cleanup or deletion ran.
- Kids public RLS/list/detail/social gates require a completed linked request, current human approval snapshot, QA and source/media fingerprints. PostgreSQL 17 integration passed; the policy migrations remain pending production.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live public Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. Branch snapshot has 45 rows and six approved stories, zero unapproved.
- Vercel production remains READY on `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`; audit branch not deployed. Vercel project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head migration and automation reconciliation — written-content Kids reservation

- Migration inventory remains 447 local / 418 remote / 29 pending / zero remote-only. The two Kids human-approval RLS migrations were tested only in disposable PostgreSQL 17 and remain unapplied in production.
- Exact code/test head `0db217863b9465615942c9ac8fc8a2180124d4f4`: Quality Gate `43773747800`, CircleCI `43773747833`, Android Debug APK `43773747753` passed. Supabase Preview `132938540531` was skipped.
- Written-content source reservation rejects encoded, nested-encoded, traversal and malformed Kids paths; normalized Kids source types cannot be backfilled as general content. The scheduled main workflow still enables Gemini; it was not dispatched.
- No production migration, content generation, social publish or storage deletion occurred.

## 2026-11-16 exact-head continuation — prayer data, native permissions and Kids approval

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `15bf6125447967fcde1f36ca92e983db36cbd407`.

- PR inventory: 635 changed paths (289 added, 346 modified, 0 deleted); 100,905 additions and 6,688 deletions.
- Recursive tree: 2,447 entries (1,948 blobs, 499 directories). Self-excluding manifest: 2,444 entries. File-status overlay: 633 unique rows — CONTENT_READ_TESTED_PASS=421, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=166, SUPERSEDED_SNAPSHOT=8. The 166 review-required paths remain open.
- Exact-head verification: Quality Gate 43777925750 passed; CircleCI 43777925783 passed; Android Native Login Debug APK 43777925734 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- Prayer-time service validates coordinate ranges, ISO calendar dates and calculation method before network access; its 60-second cache is capped at 100 entries with expired-entry pruning and LRU eviction. The prayer-location hook uses the shared service instead of bypassing its cache. Saved local/server locations reject blank/out-of-range coordinates and invalid IANA timezones before persistence. Regression tests cover invalid values, TTL reuse and bounded eviction.
- Prayer notifications use one strict time parser for cached schedule creation and delivery revalidation. The Capacitor-aware permission state is refreshed on mount and when the native bridge becomes ready or permission changes. Profile settings now provide an explicit user-triggered event for the permission banner; session-storage failure cannot prevent rendering or dismissal.
- Kids video approval requires `video.manage` and `kids.manage` where applicable; general-audience approvals reject Kids markers from encoded public paths and curated source IDs. Kids public RLS/list/detail/social gates require a completed linked request, current human approval snapshot, QA and source/media fingerprints. PostgreSQL 17 integration passed; policy migrations remain pending production.
- Written-content backfill rejects encoded/nested/traversal Kids paths and normalized Kids source types. The scheduled main workflow still enables Gemini; it was not dispatched.
- Storage cleanup scripts are bound to the exact HTTPS Supabase project host. Destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, complete reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run video auto-publish remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Vercel production remains READY on `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`; audit branch not deployed. Vercel project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head migration, prayer and notification reconciliation

- Migration inventory remains 447 local / 418 remote / 29 pending / zero remote-only. The two human-approval Kids RLS migrations were tested in disposable PostgreSQL 17 only and remain unapplied in production.
- Exact code/test head `15bf6125447967fcde1f36ca92e983db36cbd407`: Quality Gate `43777925750`, CircleCI `43777925783`, Android Debug APK `43777925734` passed. Supabase Preview `132938540531` was skipped.
- Prayer API inputs, saved-location coordinates/timezones and the 100-entry TTL/LRU cache are validated; the hook uses the shared service. Tests cover invalid dates/coordinates/methods, saved-location normalization, TTL reuse and eviction.
- Native notification permission refresh follows Capacitor bridge readiness; explicit profile opt-in now opens the permission banner. No permission prompt was invoked by audit tests.
- No production migration, content generation, Gemini request, social publish or storage deletion occurred.

## 2026-11-16 exact-head continuation — provider validation and notification failure semantics

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `b59e79611c587588586b2e4c69761c79e6cb231c`.

- PR inventory: 636 changed paths (290 added, 346 modified, 0 deleted); 101,222 additions and 6,694 deletions.
- Recursive tree: 2,448 entries (1,949 blobs, 499 directories). Self-excluding manifest: 2,445 entries. File-status overlay: 634 unique rows — CONTENT_READ_TESTED_PASS=422, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=166, SUPERSEDED_SNAPSHOT=8. The 166 review-required paths remain open.
- Exact-head verification: Quality Gate 43779807638 passed; CircleCI 43779807704 passed; Android Native Login Debug APK 43779807678 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- Prayer-time service validates coordinates, dates and calculation methods before network access; the 60-second TTL/LRU cache is capped at 100 entries. Provider responses are schema-checked before UI/scheduling use, including all required prayer times, timezone, coordinates, method and Hijri date. Malformed/partial 200 responses fail closed. The shared service is used by the location hook; saved local/server locations validate coordinate ranges and IANA timezone before persistence. Tests cover cache reuse/eviction, invalid values and malformed provider payloads.
- Prayer notifications use one strict time parser for cached schedule creation and delivery revalidation. Capacitor permission state refreshes after native bridge readiness and permission changes; profile settings provide an explicit opt-in event for the permission banner. Native/browser permission API failures are reported as unsupported rather than a user denial, preserving retryability.
- Kids video approval requires `video.manage` and `kids.manage` where applicable; general-audience approvals reject Kids markers from encoded public paths and curated source IDs. Kids public RLS/list/detail/social gates require a completed linked request, current human approval snapshot, QA and source/media fingerprints. PostgreSQL 17 integration passed; policy migrations remain pending production.
- Written-content backfill rejects encoded/nested/traversal Kids paths and normalized Kids source types. The scheduled main workflow still enables Gemini; it was not dispatched.
- Storage cleanup scripts are bound to the exact HTTPS Supabase project host. Destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, complete reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run video auto-publish remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Read-only Vercel environment inventory found `IOS_ASSOCIATED_DOMAIN_APP_ID` absent from Development/Preview/Production; the AASA route returns 503 without it. `GA4_PROPERTY_ID` and `GA4_REFRESH_TOKEN` are also absent. `ANDROID_KEYSTORE_BASE64` is present with Vercel visibility `config`, not `secret`; treat it as signing material. No secret was read, rotated, deleted or changed. Owner must confirm its use and handle any controlled visibility/rotation procedure.
- Production Vercel remains READY on main; audit branch not deployed. Project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. An owner-review request was posted in the PR conversation. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head migration, provider-response and notification reconciliation

- Migration inventory remains 447 local / 418 remote / 29 pending / zero remote-only. The two human-approval Kids RLS migrations were tested in disposable PostgreSQL 17 only and remain unapplied in production.
- Exact code/test head `b59e79611c587588586b2e4c69761c79e6cb231c`: Quality Gate `43779807638`, CircleCI `43779807704`, Android Debug APK `43779807678` passed. Supabase Preview `132938540531` was skipped.
- Prayer provider payloads are validated for complete timings, timezone, coordinates, method and Hijri date; malformed/partial 200 responses fail closed. Cache is bounded to 100 LRU entries; saved locations validate coordinates and timezone.
- Native/browser permission API failures return unsupported rather than false denial; native permission state refreshes after bridge readiness. No permission prompt was invoked by audit tests.
- No production migration, content generation, Gemini request, social publish or storage deletion occurred.

## 2026-11-16 exact-head continuation — Kids fallback approval gate

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `c6a82b457e5ee03fbcb292850eb6ddf6581a4d52`.

- PR inventory: 636 changed paths (290 added, 346 modified, 0 deleted); 101,357 additions and 6,694 deletions.
- Recursive tree: 2,448 entries (1,949 blobs, 499 directories). Self-excluding manifest: 2,445 entries. File-status overlay: 634 unique rows — CONTENT_READ_TESTED_PASS=424, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=164, SUPERSEDED_SNAPSHOT=8. The 164 review-required paths remain open.
- Exact-head verification: Quality Gate 43781785998 passed; CircleCI 43781785921 passed; Android Native Login Debug APK 43781785920 passed (debug only). Supabase Preview 132938540531 was skipped, not passed. Earlier Quality Gate 43781392966 exposed a stale static-fallback assertion; the assertion was corrected and the exact-head full suite passed.
- **Kids static fallback bypass fixed:** the prior fallback builder unconditionally overwrote every static story's `metadata.age_appropriate` to `true`, so legacy/unreviewed stories could pass the public visibility helper and appear in fallback detail/list/sitemap paths. The override is removed. `prepareKidsFallbackContent` now deduplicates and retains only content already passing the same explicit age-approval visibility predicate; the regression test compares fallback stories to the source rows already carrying `age_appropriate === true` and asserts no approval is manufactured. The first full run correctly failed on the now-obsolete source assertion; that assertion was updated to enforce the new fail-closed behavior, and the current full suite passes.
- Prayer-time service validates coordinates, dates and calculation methods before network access; the 60-second TTL/LRU cache is capped at 100 entries. Provider responses are schema-checked before UI/scheduling use, including required prayer times, timezone, coordinates, method and Hijri date. Malformed/partial 200 responses fail closed. The shared service is used by the location hook; saved local/server locations validate coordinate ranges and IANA timezone before persistence.
- Prayer notifications use one strict time parser for cached schedule creation and delivery revalidation. Capacitor permission state refreshes after native bridge readiness and permission changes; profile settings provide an explicit opt-in event for the permission banner. Native/browser permission API failures return unsupported rather than a false user denial.
- Kids video approval requires `video.manage` and `kids.manage` where applicable; general-audience approvals reject Kids markers from encoded public paths and curated source IDs. Kids public RLS/list/detail/social gates require a completed linked request, current human approval snapshot, QA and source/media fingerprints. PostgreSQL 17 integration passed; policy migrations remain pending production.
- Written-content backfill rejects encoded/nested/traversal Kids paths and normalized Kids source types. The scheduled main workflow still enables Gemini; it was not dispatched.
- Storage cleanup scripts are bound to the exact HTTPS Supabase project host. Destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, complete reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run video auto-publish remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Read-only Vercel environment inventory found `IOS_ASSOCIATED_DOMAIN_APP_ID` absent from Development/Preview/Production; the AASA route returns 503 without it. `GA4_PROPERTY_ID` and `GA4_REFRESH_TOKEN` are also absent. `ANDROID_KEYSTORE_BASE64` is present with Vercel visibility `config`, not `secret`; treat it as signing material. No secret was read, rotated, deleted or changed. Owner must confirm its use and handle any controlled visibility/rotation procedure.
- Production Vercel remains READY on main; audit branch not deployed. Project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. An owner-review request was posted in the PR conversation. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head Kids fallback approval reconciliation

- The static Kids fallback previously forced every story's `age_appropriate` metadata to true. This bypassed the explicit age-review predicate for legacy/unreviewed stories when Supabase was unavailable. The override is removed; `prepareKidsFallbackContent` deduplicates and filters through the visibility predicate. Regression coverage proves only source stories already explicitly approved can enter fallback.
- The stale source assertion initially failed in Quality Gate `43781392966`; it was replaced with an assertion that the service uses the explicit filter and never writes `age_appropriate: true`. Exact-head Quality Gate `43781785998` passed, as did CircleCI `43781785921` and Android Debug APK `43781785920`.
- Production Kids RLS remains unchanged and broad until owner-approved migrations are applied. No production migration, content generation, Gemini request, social publish or storage deletion occurred.

## 2026-11-16 exact-head continuation — Kids game source approval

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `dd3a9761a3eb134fb7c3f1ac6a06d1c592e74322`.

- PR inventory: 638 changed paths (292 added, 346 modified, 0 deleted); 101,509 additions and 6,701 deletions.
- Recursive tree: 2,448 entries (1,949 blobs, 499 directories). Self-excluding manifest: 2,445 entries. File-status overlay: 636 unique rows — CONTENT_READ_TESTED_PASS=426, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=164, SUPERSEDED_SNAPSHOT=8. The 164 review-required paths remain open.
- Exact-head verification: Quality Gate 43783279791 passed; CircleCI 43783279944 passed; Android Native Login Debug APK 43783279795 passed (debug only). Supabase Preview 132938540531 was skipped, not passed. Earlier Quality Gate 43781392966 exposed a stale static-fallback assertion; it was corrected and later exact-head suites passed.
- **Kids static fallback bypass fixed:** the old fallback builder forced every static story's `metadata.age_appropriate` to `true`, letting legacy/unreviewed stories pass public list/detail/sitemap fallback. The override is removed; `prepareKidsFallbackContent` deduplicates and filters through the explicit age-approval predicate. Regression coverage proves no approval is manufactured.
- **Kids game source bypass fixed:** public game adapters previously read quiz questions directly from all `kidsContent` rows, so unapproved/legacy story quiz questions could enter the public quiz pool even though the story itself was filtered from public lists. The verified quiz adapter now filters every source through `isKidsContentPubliclyVisible`; scenario, Wudu and memory-card adapters also enforce the same source visibility predicate. Regression tests cover unapproved stories, legacy stories without metadata, approved stories, non-story quiz content, and every scenario source. Game consumers in the Kids learning games use these verified adapters.
- Prayer-time service validates coordinates, dates and calculation methods before network access; the 60-second TTL/LRU cache is capped at 100 entries. Provider responses are schema-checked before UI/scheduling use, including required prayer times, timezone, coordinates, method and Hijri date. Malformed/partial 200 responses fail closed. The shared service is used by the location hook; saved local/server locations validate coordinate ranges and IANA timezone before persistence.
- Prayer notifications use one strict time parser for cached schedule creation and delivery revalidation. Capacitor permission state refreshes after native bridge readiness and permission changes; profile settings provide an explicit opt-in event for the permission banner. Native/browser permission API failures return unsupported rather than a false user denial.
- Kids video approval requires `video.manage` and `kids.manage` where applicable; general-audience approvals reject Kids markers from encoded public paths and curated source IDs. Kids public RLS/list/detail/social gates require a completed linked request, current human approval snapshot, QA and source/media fingerprints. PostgreSQL 17 integration passed; policy migrations remain pending production.
- Written-content backfill rejects encoded/nested/traversal Kids paths and normalized Kids source types. The scheduled main workflow still enables Gemini; it was not dispatched.
- Storage cleanup scripts are bound to the exact HTTPS Supabase project host. Destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, complete reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run video auto-publish remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Read-only Vercel environment inventory found `IOS_ASSOCIATED_DOMAIN_APP_ID` absent from Development/Preview/Production; the AASA route returns 503 without it. `GA4_PROPERTY_ID` and `GA4_REFRESH_TOKEN` are also absent. `ANDROID_KEYSTORE_BASE64` is present with Vercel visibility `config`, not `secret`; treat it as signing material. No secret was read, rotated, deleted or changed. Owner must confirm its use and handle any controlled visibility/rotation procedure.
- Production Vercel remains READY on main; audit branch not deployed. Project-settings access returned 403. iOS App ID/GA4 values, signing and physical-device acceptance remain owner/manual inputs.
- CODEOWNERS requires `@Zikrmediaofficial`; no owner approval is recorded and reviewer request did not register. An owner-review request was posted in the PR conversation. Branch-protection details remain unreadable through available API permission. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.


## 2026-11-16 exact-head Kids game source approval reconciliation

- Public static fallback and game adapters now use the explicit Kids age-approval visibility predicate. Legacy/unapproved story quiz questions are excluded from the public game pool; approved stories and non-story quiz items retain their existing contract. Scenario/Wudu/memory adapters also require publicly visible sources.
- Regression coverage was added for fallback approval, unapproved/legacy story quiz inputs, approved story inputs, non-story quiz inputs and scenario source visibility.
- Exact code/test head `dd3a9761a3eb134fb7c3f1ac6a06d1c592e74322`: Quality Gate `43783279791`, CircleCI `43783279944`, Android Debug APK `43783279795` passed. Supabase Preview `132938540531` was skipped.
- The earlier stale fallback source assertion failure in Quality Gate `43781392966` was corrected; later full suites passed. No production migration, content generation, Gemini request, social publish or storage deletion occurred.

## 2026-11-16 exact-head continuation — admin video read isolation and owner gate

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `9fcf2d1f7c7b95f6d331ce94ea5b750defd1bfba`.

- PR inventory: 639 changed paths (293 added, 346 modified, 0 deleted); 101,874 additions and 6,718 deletions.
- Recursive tree: 2,448 entries (1,949 blobs, 499 directories). Self-excluding manifest: 2,445 entries. File-status overlay: 637 unique rows — CONTENT_READ_TESTED_PASS=430, FIXED_TESTED_PENDING_LIVE_APPLY=38, REVIEW_REQUIRED=161, SUPERSEDED_SNAPSHOT=8. The 161 review-required paths remain open.
- Exact-head verification: Quality Gate 43786909181 passed; CircleCI 43786909195 passed; Android Native Login Debug APK 43786909196 passed (debug only). Supabase Preview 132938540531 was skipped, not passed. Quality Gate 43786544554 initially failed on a stale template permission-count assertion after adding the Kids-sensitive GET gate; the test was split into GET and POST assertions and the current exact-head suite passed.
- **Admin video read-permission leak fixed:** `video.manage` list/detail, generation-queue, template, and source GET routes previously returned Kids request content/metadata, Kids templates/previews/versions, and curated Kids episodes without `kids.manage`. Each read now resolves `kids.manage` for the same authenticated profile and filters Kids/unknown request content, Kids templates/previews/versions and Kids sources for general-only video managers. Unauthorized detail rows return 404. Permission matrix, canonical API guard, RBAC tests and pure visibility tests were updated. The `video-purge` POST remains hard-disabled (409); no purge was invoked.
- **Kids static fallback bypass fixed:** the old fallback builder forced every static story's `metadata.age_appropriate` to `true`, allowing legacy/unreviewed stories to pass public list/detail/sitemap fallback. The override is removed; `prepareKidsFallbackContent` deduplicates and filters through the explicit age-approval predicate. Regression coverage proves no approval is manufactured.
- **Kids game source bypass fixed:** public game adapters previously read quiz questions directly from all `kidsContent` rows, so unapproved/legacy story quiz questions could enter the public quiz pool even when the story was filtered from public lists. The verified quiz adapter now filters every source through `isKidsContentPubliclyVisible`; scenario, Wudu and memory-card adapters also enforce the same source visibility predicate. Tests cover unapproved/legacy story inputs, approved stories, non-story quiz content and scenario source visibility.
- **Kids public RLS and approval:** branch policies require a completed linked generation request, valid RFC UUID request/reviewer IDs, human approval tied to current QA/source/media fingerprints, and complete series metadata. PostgreSQL 17 integration covers automated-only, system-reviewed, incomplete and malformed-ID cases. Production policy remains unchanged pending owner approval and migration release.
- **Video approval/provenance:** admin approval/retry requires both `video.manage` and `kids.manage` for Kids content; general-audience approvals reject Kids markers from encoded public paths and curated source IDs.
- **Written-content backfill:** nested/encoded/traversal Kids paths and normalized Kids source types remain reserved; they cannot be relabelled as general content.
- **Prayer notifications:** malformed cached/provider times fail closed; the same parser is used for schedule creation and delivery revalidation. Capacitor permission state refreshes after native bridge readiness and permission changes; profile settings provide an explicit opt-in event for the permission banner. Native/browser permission API failures return unsupported rather than a false user denial.
- **Prayer data:** provider responses are schema-checked before UI/scheduling use, including required prayer times, timezone, coordinates, method and Hijri date. Malformed/partial 200 responses fail closed. The shared service validates coordinates/date/method, caps its TTL/LRU cache at 100 entries, and is used by the location hook. Saved locations validate coordinate ranges and IANA timezone before persistence.
- **Storage cleanup:** scripts are bound to the exact HTTPS Supabase project host. Destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, full reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 447 local, 418 applied remotely (latest remote `20261110170000`), 29 local-only pending, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher and non-dry-run video auto-publish remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Read-only Vercel environment inventory found `IOS_ASSOCIATED_DOMAIN_APP_ID` absent from Development/Preview/Production; the AASA route returns 503 without it. `GA4_PROPERTY_ID` and `GA4_REFRESH_TOKEN` are also absent. `ANDROID_KEYSTORE_BASE64` is present with Vercel visibility `config`, not `secret`; treat it as signing material. No secret was read, rotated, deleted or changed.
- Production Vercel remains READY on main; audit branch has not been deployed. Project-settings access returned 403. Production smoke checks against this branch have not run.
- CODEOWNERS requires `@Zikrmediaofficial`, but collaborator-permission lookup returned `permission: null`; review requests cannot register. Owner was asked in the PR conversation to add the account or update CODEOWNERS to an accessible team/account. Repository rulesets returned empty; reading `branches/main/protection` remains 403. PR mergeability is `clean`, but this is not proof of CODEOWNERS approval or protected-branch satisfaction. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.

## 2026-11-16 exact-head continuation — public video RLS, Kids queue, storage and admin isolation

**State: OPEN / NOT MERGE-READY.** PR #320 remains on `audit/zikr-kids-daily-priority-20261110` against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`. Exact code/test head: `fdbcc1ac9ddbcaed03c5f553106938be67c14829`.

- PR inventory: 640 changed paths (294 added, 346 modified, 0 deleted); 102,230 additions and 6,723 deletions.
- Recursive tree: 2,449 entries (1,950 blobs, 499 directories). Self-excluding manifest: 2,446 entries. File-status overlay: 638 unique paths — CONTENT_READ_TESTED_PASS=429, FIXED_TESTED_PENDING_LIVE_APPLY=39, REVIEW_REQUIRED=162, SUPERSEDED_SNAPSHOT=8. The 162 review-required paths remain open.
- Exact-head verification: Quality Gate 43792531954 passed with PASSED_FULL (tests, integrity, mobile, SEO, security, lint, types and production build); CircleCI 43792531969 passed; Android Native Login Debug APK 43792532053 passed (debug only). Supabase Preview 132938540531 was skipped, not passed.
- **Public video RLS migration added, tested but not applied to production:** `20261116043000_restrict_public_video_reads_from_kids_markers.sql` allows Kids public reads only with a linked request UUID, Cloudinary master media, source/content/template fingerprints, series metadata, bounded season/episode values, automated QA pass, and matching human reviewer/snapshot evidence. General-audience reads reject conflicting Kids markers in audience/category/source type/AI mode/type/content type/content format/generation mode/source IDs/public paths and any non-empty ageGroup. PostgreSQL 17 integration has 38 fixtures; anon sees only the four intended legacy/general/human-approved rows, while service_role sees all fixtures. Numeric season/episode casts use bounded CASE expressions so malformed or oversized values cannot throw.
- **Admin video read-permission leak fixed:** `video.manage` list/detail, generation-queue, template and source GET routes previously returned Kids request content/metadata, Kids templates/previews/versions and curated Kids episodes without `kids.manage`. Reads now resolve `kids.manage` for the same authenticated profile and filter Kids/unknown request content, including top-level request category and nested content markers. Request rows require a valid JSONB object; malformed rows fail closed. Unauthorized detail rows return 404. Template versions/previews and curated Kids sources are also filtered.
- **Legacy Kids social queue classification normalized and fail-closed:** unsupported Kids-marked non-video queue rows are held before provider publication. Content types and automation keys are trimmed/lowercased before written-post/unclassified classification, preventing whitespace/case variants of legacy Kids markers from bypassing the approval gate. Recognized video rows remain on the dedicated video approval/fingerprint path; `written_post` rows remain on source approval.
- **Storage path traversal hardened:** `parseStorageKey` rejects empty, dot, parent, percent-encoded and backslash path segments before owner-prefix checks. Invalid owner segments cannot become `.` or `..` and fall back to the anonymous namespace. Tests cover dot traversal, encoded/double-encoded traversal, single/double backslash separators and invalid owner fallback. Storage service/presign consumers were traced; no upload, download, deletion or cleanup was executed.
- **Kids static fallback bypass fixed:** the old fallback builder forced every static story's `metadata.age_appropriate` to `true`, allowing legacy/unreviewed stories to pass public list/detail/sitemap fallback. The override is removed; `prepareKidsFallbackContent` deduplicates and filters through the explicit age-approval predicate.
- **Kids game source bypass fixed:** public game adapters previously read quiz questions directly from all `kidsContent` rows, so unapproved/legacy story quiz questions could enter the public quiz pool even when the story was filtered from public lists. The verified quiz adapter now filters every source through `isKidsContentPubliclyVisible`; scenario, Wudu and memory-card adapters also enforce the same source visibility predicate.
- **Video approval/provenance:** admin approval/retry requires both `video.manage` and `kids.manage` for Kids content; general-audience approvals reject Kids markers from encoded public paths, curated source IDs, series-episode content format and age-group metadata.
- **Written-content backfill:** nested/encoded/traversal Kids paths and normalized Kids source types remain reserved; they cannot be relabelled as general content.
- **Open social catalog reconciliation defect:** provider publication can succeed while `syncKidsSocialPublicationToCatalog` or `syncYouTubeVideoReferenceToCatalog` fails; the failure is logged but the queue item is finalized, and the scheduled worker has no independent retry for catalog metadata. Public feed/detail currently derive publication state from the queue, so this does not itself retract a published post, but the admin video catalog can remain stale. Both service and worker remain REVIEW_REQUIRED; no live social action was used to test this.
- **Prayer notifications:** malformed cached/provider times fail closed; the same parser is used for schedule creation and delivery revalidation. Capacitor permission state refreshes after native bridge readiness and permission changes; profile settings provide an explicit opt-in event for the permission banner. Native/browser permission API failures return unsupported rather than a false user denial.
- **Prayer data:** provider responses are schema-checked before UI/scheduling use, including required prayer times, timezone, coordinates, method and Hijri date. Malformed/partial 200 responses fail closed. The shared service validates coordinates/date/method, caps its TTL/LRU cache at 100 entries, and is used by the location hook. Saved locations validate coordinate ranges and IANA timezone before persistence.
- **Storage cleanup:** destructive apply remains manual and requires paused writers, typed owner confirmation, live retention-RPC preflight, full reference inventory and exact-path verification. No cleanup or deletion ran.
- Supabase migrations: 448 local, 418 applied remotely (latest remote `20261110170000`), 30 local-only pending including the new public-video RLS migration, zero remote-only. No production migration was applied.
- Read-only production evidence: live Kids RLS remains `TO public USING (published = true)`; 32 published internal Kids rows had zero human reviewers and 32 linked requests without `kidsVideoQaStatus='passed'`. Social queue: 15 post-cutoff Kids rows (12 published, 1 partial, 2 queued), none with human approval. Main's 15-minute publisher, non-dry-run video auto-publish and three-times-daily Gemini written-content workflow remain enabled.
- Main offline Kids JSON has 65 rows, including 26 stories with 20 lacking explicit age approval. The branch snapshot has 45 rows and six approved stories, zero unapproved.
- Read-only Vercel environment inventory found `IOS_ASSOCIATED_DOMAIN_APP_ID` absent from Development/Preview/Production; the AASA route returns 503 without it. `GA4_PROPERTY_ID` and `GA4_REFRESH_TOKEN` are also absent. `ANDROID_KEYSTORE_BASE64` is present with Vercel visibility `config`, not `secret`; treat it as signing material. No secret was read, rotated, deleted or changed.
- Production Vercel remains READY on main; audit branch has not been deployed. Project-settings access returned 403. Production smoke checks against this branch have not run.
- CODEOWNERS requires `@Zikrmediaofficial`, but collaborator-permission lookup returned `permission: null`; review requests cannot register. Owner was asked in the PR conversation to add the account or update CODEOWNERS to an accessible team/account. Repository rulesets returned empty; reading `branches/main/protection` remains 403. PR mergeability is `clean`, but this is not proof of CODEOWNERS approval or protected-branch satisfaction. PRs #321–#325 still overlap.
- No content generation, Gemini request, social publish, production DB mutation, Storage/media deletion, release, merge or deployment occurred. Owner review, migration approval/application, publisher hold/reconciliation, provider-account acceptance, signed device acceptance and post-deploy smoke tests remain open.



## 2026-11-16T14:50Z — superseding read-only migration reconciliation

This checkpoint supersedes the older 2026-11-16 snapshot above. It is a read-only comparison against production project `zqtssvlvmkzeeyqghqfk` and the exact main repository snapshot `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`.

- Supabase project status: `ACTIVE_HEALTHY`.
- Local migration files: **449**.
- Remote `list_migrations` entries: **449**.
- Version-set comparison: **exact match**; zero local-only versions and zero remote-only versions.
- Latest local and remote version: `20261116045100` (`require_linked_request_for_public_kids_videos`).
- The previous 447-local / 418-remote / 29-local-only figures remain historical evidence for their earlier checkpoint only; they are not the current production migration count.
- No migration was applied, repaired, pushed, or rolled back during this verification.

### Background reminder timezone contract — read-only

The production `public.background_reminder_preferences` table has RLS enabled. The authenticated role has SELECT, INSERT and UPDATE privileges; anon SELECT is denied. The table contained one row and zero timezone values absent from `pg_catalog.pg_timezone_names` at the time of the query. However, the table had no timezone-specific CHECK constraint or trigger. The application route normalizes timezone values, but authenticated owner-scoped PostgREST writes can bypass that application path. The planner and Edge worker silently fall back to UTC when a stored timezone cannot be resolved, which can evaluate a user's quiet-hours window in the wrong timezone.

Draft PR #349 adds a trigger-only database guard, a fail-closed preflight for existing rows, and PostgreSQL integration tests for invalid authenticated INSERT/UPDATE. Its proposed migration `20261116150000_enforce_background_reminder_timezone.sql` is **local to the PR branch and not applied to production**. Current invalid-row count is zero, so the migration preflight should pass if the data remains unchanged before owner-approved deployment.


## 2026-11-16 — read-only Kids and cleanup contract verification

**Repository baseline:** `main@a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`.

**Live migration history:** Supabase `list_migrations` returned 449 applied versions; latest version is `20261116045100`. The main-branch migration ledger remains 449 local / 449 remote with exact version-set equality. No migration was applied during this checkpoint.

**Live Kids game-result privileges (read-only catalog query):**

| Contract | Result |
|---|---:|
| `kids_game_results` RLS enabled | true |
| authenticated SELECT | true |
| authenticated INSERT | false |
| authenticated UPDATE | false |
| anon INSERT | false |
| service_role INSERT | true |
| authenticated EXECUTE on `kids_record_game_result_internal` | false |
| service_role EXECUTE on `kids_record_game_result_internal` | true |

This confirms the applied `20261009054919` client-write hardening and the service-role-only RPC boundary. The applied RPC from `20261001214711` still has a concurrent duplicate race: its SELECT occurs before INSERT, while the per-user trigger lock is acquired only during INSERT. PR #353 proposes `20261116180000_serialize_kids_game_result_idempotency.sql`, which acquires a two-key transaction advisory lock before the duplicate lookup. That migration exists only on PR #353 head `88b6560e52a3624d22cc8d4ca0145b2bbb6f3d7e`; it is not applied and must remain pending owner approval and exact-head CI.

**Live YouTube/Facebook cleanup state (read-only):**

- `cron.job` has no YouTube/Facebook media-cleanup job; `zikr-youtube-facebook-sync` is inactive.
- `storage.buckets` has no `youtube-facebook-media` bucket.
- `social_sync_state` has no configured cleanup secret.
- Zero published social-sync rows are eligible for source-media cleanup.
- Repository search found no in-repository caller for `/api/internal/youtube-facebook/cleanup-media`.

The route and cleanup script were inspected only. No endpoint was invoked, no job was dispatched, and no Storage object was removed. The legacy route should not be reactivated until a compare-and-set/lease claim and shared-path reference protection are in place.

**Safety:** all statements above came from read-only catalog/metadata queries. No production DDL, DML, RLS changes, function replacement, cron change, bucket change, secret read, or storage operation occurred.

## Current configured project — read-only snapshot, 2026-11-16

Project: Zikrofficial (zqtssvlvmkzeeyqghqfk). State ACTIVE_HEALTHY; region eu-west-2; PostgreSQL 17.11.0.018.
Method: Supabase project metadata, migration list, table inventory, Edge Function metadata, advisors and SELECT-only SQL queries. No DDL/DML, migration apply, RPC mutation, Edge Function invocation/deployment or storage mutation was performed.

### Migration and table inventory

- Applied migration count: 449. Latest applied version: 20261116045100_require_linked_request_for_public_kids_videos, matching the latest migration in main a0f51cdc3fc31503f12ddddba76e37d9e07a15f7. PR-only migrations for the pending timezone and legacy Kids idempotency fixes are not in main and were not applied.
- Table inventory: 103 tables across public and storage schemas, including 93 public tables. No public table was found with RLS disabled.
- Historical nmdeaz project counts and policy observations below must not be used to describe the currently configured project.

### Current Kids and video RLS contracts

- kids_content public reads require published and active rows; story rows additionally require metadata.age_appropriate=true.
- kids_game_levels public reads require the level to be published and its parent game to be published.
- kids_game_questions has no public read policy; only the admin read policy remains.
- videos public reads require public availability, QA passed, explicit human approval, a non-system reviewer, approval timestamp, source verification and a linked video_generation_requests row with matching request/source/content/template hashes. Kids videos use the private human-approval helper; general video rows with Kids markers are excluded.
- increment_kids_content_shares is SECURITY INVOKER with empty search_path and service-role-only execution. save_default_prayer_location is SECURITY INVOKER with empty search_path, granted to authenticated and service_role. admin_approve_video_generation_request is SECURITY INVOKER with empty search_path and service-role-only execution. The private Kids approval helper is SECURITY DEFINER with empty search_path, schema-qualified references and boolean-only output.
- kids_record_game_result, kids_record_game_result_internal and kids_validate_game_result_insert remain SECURITY DEFINER with search_path=public and service-role-only ACL. Table references are schema-qualified; record this as a separate hardening review item, not as public execution exposure.

### Storage buckets and write access

- Nine buckets are present: android-releases, audio, avatars, documents, media, public-assets, quran-audio, site-audio and videos.
- videos is public with a 50 MiB limit and had zero objects at the snapshot. public-assets is public with no configured size/MIME limit and had zero objects; no current application consumer was found. site-audio is public with a 50 MiB limit and six objects. youtube-facebook-media is absent.
- storage.objects has owner-scoped policies for user-owned buckets. No direct anon/authenticated write policies exist for videos, site-audio, public-assets or android-releases; service-role server paths own writes.
- The admin video upload route uses video.manage step-up and post-commit audit, but the public videos bucket means a newly uploaded draft is readable before the form is saved. There are currently zero objects, so no existing object exposure was observed. Private staging/expiry is a design follow-up; no object was created or deleted.

### Cron jobs and deployed Edge Functions

| Job | Schedule | Active |
|---|---|---|
| zikr-cron-history-cleanup | 30 3 * * * | yes |
| zikr-prayer-push-dispatch | * * * * * | yes |
| zikr-source-verified-content-agent | 0 3 * * * | yes |
| zikr-youtube-facebook-sync | */10 * * * * | no |

- No YouTube/Facebook media cleanup cron exists.
- Deployed Edge Functions: prayer-notification-worker v80, source-verified-content-agent v15, spiritual-ai v3 and health v3. The deployed prayer worker and source agent files inspected in this run match local main byte-for-byte. Their auth gates were inspected; neither function was invoked.
- No sync-youtube-facebook or cleanup-youtube-facebook-media Edge Function is deployed. The Supabase sync cron is inactive; GitHub Actions is the active social publisher.

### Advisor results and owner settings

- Security advisor: leaked-password protection is disabled (owner must enable in Supabase Auth settings). Five RLS-enabled tables intentionally have no client policies and are service-role-only: push_subscriptions, site_audio_assets, site_audio_upload_intents, social_publish_queue and video_generation_requests.
- Performance advisor: 79 unused-index notices, one unindexed foreign key (site_audio_upload_intents.asset_id) and one multiple-permissive-policy notice on prophet_sections. No index was dropped or added.
- Health advisor returned no lints.

### Automation safety note

- GitHub Actions schedules written-content generation at 15 7,13,19 UTC using Gemini; AI video generation at 17 3,9,15,21 UTC in free-only mode with Gemini fallback disabled; and social publishing at 7,22,37,52 minutes each hour, with public YouTube/Facebook publishing when credentials and database settings permit. CircleCI English-content sync runs daily at 04:17 UTC and uses Gemini plus Supabase service-role writes. Kids written posts and Kids videos remain blocked from external publication until explicit human approval. The Kids catalog-only reconciliation path is not merged; its GitHub variable defaults false and must be explicitly enabled by an owner after merge. No workflow was manually dispatched by this audit; normal schedules remain enabled.
- These workflows are production automation, not audit fixtures. None was dispatched by this audit. The Supabase YouTube/Facebook sync cron being inactive does not mean social publishing is disabled; the GitHub workflow is scheduled.
- The legacy Next.js cleanup-media route has no caller or Vercel cron and its expected bucket is absent. The separate audit-video-media workflow runs daily at 04:41 UTC in production and updates videos metadata; current main can resurrect deleted YouTube IDs and overwrite custom thumbnails, with PR #339 fixing it but still unmerged. The storage-retention workflow runs daily at 02:17 UTC in dry-run mode only; manual apply requires paused reference writers, typed confirmation and the safe RPC, with PR #341 adding missing Quran/audio references and bounded scans. Site-audio cleanup is manual-only. None was manually dispatched or applied by this audit.

### Audit boundary

No content generation, Gemini request, social publishing, push dispatch, media audit workflow dispatch, storage-retention apply, production mutation, migration apply, Edge Function invocation/deployment, Android/iOS release, Vercel deployment or storage deletion was manually triggered by this audit. Normal scheduled workflows remain enabled. All direct live database checks in this section were read-only.
