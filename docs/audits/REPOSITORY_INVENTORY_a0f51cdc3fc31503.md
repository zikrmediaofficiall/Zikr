# Repository inventory — main snapshot a0f51cdc3fc31503f12ddddba76e37d9e07a15f7

Generated: 2026-11-16T13:04:59.302Z
Updated: 2026-11-17T06:29:29.000Z (RLS initplan and FK-index migration review; PR #394 forward repair pending)

## Exact snapshot

- Repository: `zikrofficial-X/Zikr`
- Main commit: `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`
- Git tree SHA: `7a73fa9af3ae0de67275dd33c4a1f8f18038d909`
- Recursive tree entries: **2459**
- Tracked blobs/files: **1959**
- Directories: **500**
- Tree truncated: **no**
- Full manifest: [`docs/audits/REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl`](./REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl) — blob SHA `baace6d0c66ac299edb541c7caceba56eeae19be`
- Full file-status matrix: [`docs/audits/REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl`](./REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl) — current blob SHA `8e905fbcb3b4342a8fce6e635c88763f2b0546ab`

The manifest includes every recursive tree entry (files and directories). The status matrix contains one row for every tracked blob. Unreviewed files are explicitly marked `UNREVIEWED`; no prior summary or manifest was treated as source review.

## Reconciliation of the prior PR320 artifacts

| Artifact | Previous snapshot | Current main snapshot | Result |
|---|---:|---:|---|
| PR320 manifest entries | 2446 | 2459 tree entries | stale |
| PR320 manifest blobs | 1949 | 1959 blobs | stale |
| PR320 manifest directories | 497 | 500 directories | stale |
| Blob/tree SHAs changed | — | 113 | must refresh |
| Paths in current tree but absent from old manifest | — | 13 | must add |
| Old manifest paths absent from current tree | — | 0 | none |
| PR320 overlay rows | 639 | 638 unique paths | one duplicate row |

- Duplicate overlay row: `.circleci/config.yml`.
- The old overlay was a PR320-specific change-path overlay, not a full-repository status matrix. Its header counts were 429 passed, 39 fixed/tested/pending live apply, 162 review required, and 8 superseded.
- The 13 tree entries absent from the old manifest include the manifest file itself (excluded from its own snapshot). The other 12 entries are 3 directories and 9 blobs: `docs/`, `docs/audits/`, `docs/audits/FINAL_REVIEW_2026-11-16.md`, `scripts/tests/auth-safe-next-path.test.ts`, `scripts/tests/oauth-origin.test.ts`, `scripts/tests/social-kids-catalog-reconciliation.test.ts`, `scripts/tests/youtube-oauth-actor.test.ts`, `src/features/social/services/kids-social-catalog-reconciliation.ts`, `src/lib/auth/`, `src/lib/auth/oauth-origin.ts`, `src/lib/safe-relative-path.ts`, and `supabase/migrations/20261116045100_require_linked_request_for_public_kids_videos.sql`.
- The new matrix supersedes those artifacts for the `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` snapshot; historical files remain unchanged.

## File-status matrix

- Total tracked file rows: **1959**
- `UNREVIEWED`: **1165**
- Non-`UNREVIEWED` file rows: **794**
- High-priority `UNREVIEWED`: **357**

- Foreign-key index migration review: `20260814143626_add_missing_foreign_key_indexes.sql` is production-applied. Six optional target tables are absent and four present FK columns have valid leading indexes; current indexes use equivalent `idx_*` names.
- Read-only production RLS catalog check: all three historical migration versions are present; 46 public policies contain `auth.uid()`, zero raw UID calls remain after removing SELECT-initplan wrappers, and zero public policies contain `auth.jwt()`. The forward PR #394 migration is expected to be a no-op on the current production catalog.
- Additional source trace: read `20261002042816_optimize_rls_auth_initplans_20261002.sql` and confirmed its legacy-table guards plus canonical Kids owner-policy definitions; its RLS consumer evidence is recorded in the matrix.

- `REVIEWED_PARTIAL`: 95
- `FIX_PENDING_PR346`: 1
- `REVIEWED_SOURCE_ONLY`: 304
- `UNREVIEWED`: 1165
- `FIX_PENDING_PR382_PR394_PR395_PR396`: 1
- `OWNER_SETTING_REQUIRED`: 1
- `FIX_PENDING_PR351`: 2
- `DOCS_RECONCILIATION_PENDING`: 4
- `REVIEWED_DATA_VALIDATED`: 49
- `FIX_PENDING_PR381`: 9
- `FIX_PENDING_PR337`: 5
- `HISTORICAL_PR320_OVERLAY`: 1
- `HISTORICAL_STALE_MANIFEST`: 1
- `FIX_PENDING_PR350`: 2
- `FIX_PENDING_PR343_PR376_PR377_PR378_PR379_PR380_PR381_PR386_PR387_PR388`: 1
- `REVIEWED_DATA_GENERAL_EDITORIAL`: 1
- `FIX_PENDING_PR387_PR388`: 1
- `FIX_PENDING_PR369`: 1
- `FIX_PENDING_PR381_PARTIAL_REVIEW`: 3
- `REVIEWED_REGRESSION_COVERAGE`: 71
- `FIX_PENDING_PR343`: 2
- `FIX_PENDING_PR349`: 5
- `FIX_PENDING_PR352`: 3
- `FIX_PENDING_PR353`: 4
- `FIX_PENDING_PR340`: 3
- `FIX_PENDING_PR382`: 6
- `FIX_PENDING_PR373`: 4
- `FIX_PENDING_PR389`: 2
- `FIX_PENDING_PR362`: 3
- `FIX_PENDING_PR397`: 2
- `FIX_PENDING_PR347`: 2
- `FIX_PENDING_PR370`: 4
- `FIX_PENDING_PR398`: 2
- `FIX_PENDING_PR393`: 2
- `FIX_PENDING_PR375`: 2
- `FIX_PENDING_PR341`: 1
- `FIX_PENDING_PR338`: 3
- `FIX_PENDING_PR339`: 2
- `FIX_PENDING_PR380`: 2
- `FIX_PENDING_PR391_PR395`: 1
- `FIX_PENDING_PR376`: 4
- `OWNER_CONFIG_REQUIRED_PR343`: 1
- `REVIEWED_PRODUCTION_SMOKE_200`: 4
- `REVIEWED_PERMISSION_SCAN`: 84
- `FIX_PENDING_PR379`: 4
- `FIX_PENDING_PR378`: 3
- `FIX_PENDING_PR382_PR383`: 1
- `SECURITY_FIX_PENDING_PR340`: 5
- `FIX_PENDING_PR372`: 1
- `FIX_PENDING_PR387`: 2
- `FIX_PENDING_PR358`: 2
- `FIX_PENDING_PR377`: 1
- `FIX_PENDING_PR376_PR384`: 1
- `FIX_PENDING_PR395`: 1
- `FIX_PENDING_PR390`: 1
- `FIX_PENDING_PR374`: 1
- `REVIEWED_PRODUCTION_APPLIED`: 62
- `HISTORICAL_DESTRUCTIVE_REVIEW_REQUIRED`: 5
- `FIX_PENDING_PR392`: 1
- `FIX_PENDING_PR394`: 2

The matrix has 1959 file rows; 794 are not marked `UNREVIEWED`. Fix-pending, owner-pending, historical-exception and source-only statuses are not equivalent to merged or production-verified closure.

## Review batch — 2026-11-17 (billing cancellation and legacy table retirement lineage)

- Read the full 20260807002000 global billing cancellation migration and the five 20260919 retirement/reconciliation files. The live Supabase migration ledger contains versions 20260807002000, 20260919021452, 20260919044739, 20260919045742 and 20260919060000.
- The billing migration inserts a cancel_billing_globally audit row, sets every non-free user_subscriptions plan to free and changes every pending payment to rejected. The later 20261002130000 migration copies legacy admin_actions_audit rows into admin_audit_events before dropping the legacy audit table. A read-only production query confirms exactly one admin_audit_events row with action cancel_billing_globally. No billing rows or user identifiers were queried.
- Current production catalog has no public.user_subscriptions, public.payments or public.subscriptions table. The two 20260919045742 / 20260919060000 migrations drop these and other legacy tables without row-copy logic. Their comments and Phase 17/18 documents say the legacy tables were audited empty, but those documents identify the older project ymxdswkaxafakugktsim; the active project zqtssvlvmkzeeyqghqfk was created 2026-11-06. No current-project pre-drop row-count or backup proof was found. These three destructive migrations are now HISTORICAL_DESTRUCTIVE_REVIEW_REQUIRED pending owner confirmation; no restore/recreate/replay was attempted.
- The 20260919021452 and 20260919044739 files are SELECT 1 reconciliation markers only and are marked REVIEWED_SOURCE_ONLY.
- Current row-level matrix: 1,959 file rows; 1,180 UNREVIEWED (363 high priority); 779 non-UNREVIEWED. Historical destructive review required now covers five rows. The immutable main manifest remains unchanged.
- No production SQL write, migration apply, billing change, restore, cron, Edge Function, content generation, Gemini request, social provider call, storage operation, release, merge or deployment was performed.

---

## Review batch — 2026-11-17 (social deletion ambiguity and matrix metadata reconciliation)

- Read the complete social admin POST route delete_published path, queue metadata helper, provider deletion adapter, deletion visibility helper, platform-result parser and focused deletion regression suite on PR #393.
- Found a second fail-open case beyond the explicit cross-platform-key mismatch: legacy array-shaped platformResults with duplicate entries for the same provider could be accepted by the first-match lookup in successfulPlatformRemoteId. The route also selects the first matching result, then calls the claim helper; without a malformed-ledger guard, the claim could persist and permit a remote provider delete against an ambiguous record.
- PR #393 adds hasMalformedSocialPlatformResults preflight to the shared remote-ID resolver. Both the deletion-claim and metadata-CAS paths now reject duplicate/invalid ledgers before PATCH. Regression tests assert stale / false and zero PATCH calls for duplicate YouTube entries. New exact head: 497562bb13092037dcaa841559f75a24ce133ba4; GitHub Quality Gate run 44019233186 passed on exact head 497562bb13092037dcaa841559f75a24ce133ba4; CircleCI config-guard, source-verify and application-build-docs all passed; Supabase Preview was skipped. The canonical job completed Edge Function type-check, PostgreSQL 17 integration contracts and canonical source/architecture gate successfully. package.json test includes scripts/tests/social-deletion.test.ts. Prior head b386dd58de04cf49a6330d582409e8c1f1b6dad2 passed its own Quality Gate and all three CircleCI contexts; those results do not cover the new head.
- PR #389 exact head b788f56d03caf22085b0e87c059665fa81c12957: Quality Gate run 44016678846 passed, Android Debug APK run 44016678960 passed, and CircleCI config-guard/source-verify/application-build-docs all passed. Supabase Preview was skipped. The new forward migration is not applied; no cron was executed.
- The matrix row-level statuses total exactly 1,959 and contain 1,185 UNREVIEWED rows (368 high-priority). Its snapshot header still reported 1,205 / 377 and stale per-status counts; the header is now recomputed from the row data. The immutable main manifest remains unchanged at blob baace6d0c66ac299edb541c7caceba56eeae19be; PR-only source files are not inserted into the main manifest.
- No social provider call/deletion, production SQL/DDL/DML, migration apply, cron/Edge Function invocation, content generation, Gemini request, storage/media operation, release, merge or deployment was performed.

---

## Review batch — 2026-11-17 (RLS history and contact submission)

- Read the complete August 7 security/search/index migration, explicit EXECUTE revoke migration, and runtime-table/RLS migration; read the August 14 private admin-predicate and authenticated-role migrations; read the August 15 permissive-policy cleanup and video-category overlap removal; read the October 15 secure-contact migration. Traced the later migration that supersedes the historical `contacts_public_insert WITH CHECK (true)` policy.
- Read-only production catalog queries found `contacts` has only `contacts_admin_read`, authenticated SELECT, and no anon/authenticated INSERT privilege. `20261015050000_secure_contact_submission.sql` drops the historical public INSERT policy and revokes direct INSERT; the contact API route performs bounded validation, HMAC actor derivation, and a fail-closed 5-per-600-second service-role rate limit before insertion. No contact row was read or changed.
- Read-only production policy inspection confirmed current public-read policies for videos/articles/stories/Kids/Quran/Hadith and explicit false policies for `prayer_schedule_cache` and `push_runtime_settings`. The 33 tables named by the August 15 permissive-policy cleanup all exist in the current production schema; the migration's unguarded table-existence assumption remains documented for partial-preview review.
- Read the trusted-client-address helper. Vercel's official request-header documentation says it overwrites `X-Forwarded-For` to prevent spoofing and `x-real-ip` is identical; this is suitable for the current direct Vercel path, while a future external proxy would require a verified proxy contract: https://vercel.com/docs/headers/request-headers
- No production rows, policies, grants, migrations, or contact submissions were changed. No customer content or personal contact data was queried.

## Review batch — 2026-11-17 (scheduler guard and social deletion identity)

- Read the complete prayer project-ref reconciliation migration, its PostgreSQL 17 setup/assertion files, the scheduler worker/auth consumers, and the integration runner. The applied reconciliation migration schedules `net.http_post` without a `pg_net` availability check. PR #389 adds a forward guard that matches the exact dispatcher name, worker endpoint and scheduler-secret command, preserves unrelated same-name jobs, and fails if `cron.unschedule(bigint)` is unavailable. Its migration was renumbered to `20261117050000` to avoid the stories policy migration `20261117030000` in PR #388 and secret rotation `20261117040000` in PR #392. Exact head: `b788f56d03caf22085b0e87c059665fa81c12957`; Quality Gate/Android/CircleCI were still running at this checkpoint; Supabase Preview was skipped. No production migration or cron was run.
- Read the complete social queue metadata helper and the admin remote-deletion route path. Found that object-keyed `platformResults` trusted the map key but ignored an explicit conflicting `candidate.platform`; this could let a malformed cross-platform remote ID pass the deletion-claim/CAS precondition. PR #393 exact head `b386dd58de04cf49a6330d582409e8c1f1b6dad2` rejects explicit platform mismatches and adds zero-PATCH regression cases. GitHub Quality Gate `44016422205` passed with `QUALITY_GATE=PASSED_FULL`; CircleCI config-guard, source-verify and application-build-docs all passed. Supabase Preview was skipped. No provider API call, remote deletion or database mutation occurred.
- Read the video catalog publication policy and its full regression test; read the published-video cleanup helper and its full test; read the social deletion provider helper and visibility helper. The cleanup worker only marks the 48-hour staging-retention deadline; it does not delete Cloudinary masters or Supabase Storage objects. Actual cleanup remains separately gated. No media was deleted.
- PR #392 exact head `92964e296997b41de8e5bb0f2bef05cb7daba44e` passed Quality Gate `44009265330`, Android Debug `44009265370`, and all three CircleCI contexts; the weak live scheduler-secret format remains until owner review, merge and approved migration apply. Secret value was not read.
- PR #384 exact head `f1d3cd43762ee47e7f0fbf19c4c9bb98ec99c868` passed Quality Gate `44002881276` and all three CircleCI contexts; it is stacked on PR #376 head `f4f37ab05f1e6b8f4fd529f1aaeb7bdcb5c69813`. PR #391 exact head `e7e2df894f69b678d17b82211d5a12f9de17f52e` passed Quality Gate `44006861723`, Android Debug `44006861706`, and all three CircleCI contexts.
- Migration versions across the current audit stack are distinct: PR #386 `20261117010000`, PR #387 `20261117020000`, PR #388 `20261117030000`, PR #392 `20261117040000`, PR #389 `20261117050000`. PR #386 is stacked on #385; PR #388 is stacked on #387. No migration was applied.
- Read-only Vercel inventory shows production deployment `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr` is READY on `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`; main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` is four commits ahead. `vercel.json` keeps Git deployment disabled; no deployment or production smoke suite was triggered.
- Owner/CODEOWNERS approval remains absent. The CODEOWNERS account has no collaborator permission visible to this connection; branch-protection settings remain unreadable (GitHub API 403). Physical Android/iOS, Apple Team ID/Associated Domains/AASA, Play signing, OAuth callbacks and push-delivery acceptance remain manual/device-only.
- No production SQL/DDL/DML, migration apply, Edge Function/Cron invocation, Gemini/content generation, social publish, provider call, Storage/media deletion, secret/index change, release, merge or deployment was performed.

## Review batch — 2026-11-17 (narration provenance and worker SSRF guard)

- Read the admin video studio upload/create path, narration-upload API, media-assets registration/audit helpers, recovery-reference helper, admin create route, and the worker audio fetch path. The create route copied caller-controlled content.audioUrl/audioSource and the worker fetched any HTTPS URL server-side; the audio body was downloaded with unbounded arrayBuffer. The separate humanAudioUrl check only validated a Cloudinary-looking prefix, not a matching media_assets row or uploader.
- PR #381 exact head `06103c8627c264d4cf497ed93c68859d09b0a958` strips client-supplied audio provenance, requires the exact current-admin media asset ID/URL/public ID with audio type, Cloudinary purpose, audit_recorded=true, upload_state=ready, unpublished state, allowed MIME and <=15 MiB; the client stops on reconciliation_pending and sends the asset ID; the worker accepts only canonical Quran ayah audio or tracked Cloudinary narration, rejects redirects, and streams with a 15 MiB bound.
- First PR #381 head `739e21736c3274b056e6a1afaad166c6cf2d5ed7` reached Quality Gate but failed because the existing admin-video-factory verifier still expected the removed `ownCloudinaryAudioUrl` helper. The verifier was corrected in `06103c8627c264d4cf497ed93c68859d09b0a958`; new exact-head Quality Gate and CircleCI results are pending. No failed check was bypassed.
- The 3,019-line worker and large studio client remain only partially reviewed; this batch closes the audio path only, not their other branches. New helper `src/features/media/services/video-audio-source.ts` is PR-only and is intentionally not inserted into the immutable main manifest/matrix.
- No content generation, TTS/Gemini, Cloudinary upload/delete, social publishing, production DB mutation, storage cleanup, release, merge or deployment was performed.


## Review batch — 2026-11-17 (video feed, admin audit, template contracts)

- Read the full post-commit audit helper and its regression test/consumer contracts; read the admin audio-choice field and confirmed no repository consumer; read the public video-like component, its API route, and the aggregate-count migration; read the YouTube feed integration and playlist-cache test; read template configuration, deterministic creative variation, their API/worker call sites, type declarations, and registered tests.
- Found a reproducible concurrency defect in YouTube feed sync: the public `/videos` server-render path can enter `syncYoutubeFeed()`; an unconditional upsert is not an atomic lock, so concurrent requests can both pass the cooldown read and call the YouTube API. The final success/error upserts can also overwrite a newer attempt. PR #380 exact head `66dde1c4279b6513e395a57ab906b4117a8e82ad` adds compare-and-set lock acquisition and attempt-scoped finalization plus focused regression tests. Quality Gate `43969510424` and CircleCI config-guard/source-verify/application-build-docs passed; owner review remains pending. No provider request was run.
- PR #358 exact head `1cd16fff5d673e9af1b6aa09b96d78e93566fb2e` hardens public video-like aggregate RLS and adds explicit viewer filtering; Quality Gate `43925765683`, Android Debug `43925765653`, and all three CircleCI contexts passed. The migration remains unmerged/unapplied and owner review is absent. Read-only production snapshot had zero aggregate rows; no production data changed.
- Existing template tests cover audience-specific asset allowlists, immutable template versions, Kids permission binding, preview isolation and audio-policy wiring. Creative variation tests cover deterministic retry stability and Kids-specific hooks/scenes. Post-commit audit tests cover best-effort behavior and mutation-before-audit ordering. No defect found in these inspected modules.
- Matrix now records 1,258 UNREVIEWED files (420 high priority), with 701 non-UNREVIEWED rows. Immutable manifest remains anchored to main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; no PR-only file was inserted into the manifest.
- No YouTube provider call, content generation, Gemini request, social publishing, production database mutation, storage/media operation, native release, merge or deployment was performed.


## Review batch — 2026-11-16 21:15 UTC

- Read and parsed all 23 canonical Quran catalog/ayah/Tafsir SQL seed files. Source contains 6,236 unique Quran ayahs and 6,236 unique Tafsir al-Muyassar entries across 114 surahs; all 23 migration versions are applied. Read-only production queries match every per-surah count, show zero missing/extra tafsir keys, zero empty text, 172 valid reciters and 19,608 valid external audio pairs. No migration replay or audio/storage operation occurred.
- Read the poetry-insight route, shared AI rate-limit service/identity, poetry system prompt, bounded JSON reader, rate-limit migration and regression tests. Existing `pnpm test` coverage verifies authentication-before-body, 64 KiB streamed bound, user HMAC quota before Gemini, fail-closed limiter, prompt isolation, and byte-level body limits. Main Quality Gate run `43833156580` passed full verification on exact main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`. No Gemini request was made.
- Read-only production ACL checks confirm `consume_admin_rate_limit` is SECURITY DEFINER with `search_path=public`, EXECUTE denied to anon/authenticated and granted to service_role; `admin_rate_limits` RLS enabled, client SELECT denied and service_role SELECT allowed. Migration `20261008082029` is applied. No rate-limit RPC was invoked.
- Read the public search API route. A cache miss set `Cache-Control: public, max-age=60, stale-while-revalidate=300`, while a cache hit omitted it. PR #370 current exact head `31c6262005e8a91f6c73e418519d0dfdda84d542` now shares the header object and adds a parity regression assertion. Earlier head `f5596f7` passed full Quality Gate/CircleCI/Android debug; the new cache-header commit requires fresh exact-head checks, which are pending.
- PR #369 remains green on exact head `5b2ad8514fa7bd0d4de08c18111539ee03adfed3`: Quality Gate `43953516859` full, CircleCI source/application/config and Android debug APK `43953516793` passed. Owner review remains outstanding.
- Production remains on READY deployment source `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`; main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` is four commits ahead and not deployed. No HTTP smoke or deployment was run.
- No content generation, Gemini request, social publish, production mutation, storage/media deletion, release, merge, deployment or workflow dispatch occurred.

## Review batch — 2026-11-16 14:44 UTC

- Read 24 additional tracked files at main SHA `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`: 20 are classified `REVIEWED_SOURCE_ONLY` and 4 `REVIEWED_PARTIAL`. The matrix remains one row per tracked blob; the manifest remains the immutable full-tree snapshot for the same main SHA.
- Updated matrix blob SHA: `0f313d1ba206c272b81c5dd653f4e72a41c0f8e4`. Counts now reconcile to 1,660 `UNREVIEWED` files and 674 high-priority unreviewed files.
- The site-audio cleanup test is already part of `pnpm test`, which is included in both canonical verification commands. Its test and cleanup script were read; no cleanup was executed.
- Migration-history reconciliation is manual-only in its workflow and runs strict schema parity before history-only repair. The controlled release caller is behind typed RELEASE, CODEOWNER, exact-main-SHA and production-environment gates. No migration or ledger repair was run.
- Scheduled Kids written-content generation explicitly enables Kids source selection. The worker reads only published, active, `age_appropriate=true` Kids stories and checks generated copy for child personal-data solicitation; the publishing validator rechecks the live source and text. There is no separate human-review check for the generated written copy. This is an owner policy acceptance, not a confirmed defect under the current documented video-only human-review rule.
- YouTube upload helper defaults to private, but `.github/workflows/publish-social.yml` explicitly sets `YOUTUBE_UPLOAD_PRIVACY=public`. This is a production policy override, not a default; owner acceptance is required before treating public upload visibility as intended.

## Review batch — 2026-11-16 14:52 UTC

- Read 14 additional database-contract files: 8 source-only, 1 partial and 5 marked `FIX_PENDING_PR349`. The table/RLS migrations, timezone migration, interval migration, function-privilege migration, anon-privilege migration, API route, server-only preference service, timezone normalizer, integration harness and focused test were read.
- A read-only Supabase comparison found **449 local / 449 remote migration versions**, exact version-set equality, zero local-only/remote-only, latest `20261116045100`. The older 447/418 snapshot in `supabase/REMOTE_MIGRATION_LEDGER.md` was stale; a superseding entry is appended with the exact read-only evidence. No migration repair or schema mutation was run.
- The live reminder preference table has RLS enabled and authenticated owner-scoped SELECT/INSERT/UPDATE, but no database timezone constraint/trigger. It had one row and zero invalid timezone values. Direct authenticated PostgREST writes can bypass the API's `normalizeIanaTimeZone` validation; the worker/planner then fall back to UTC. Draft PR #349 adds a trigger and regression coverage; it is not applied to production.
- Current matrix totals: 1,636 unreviewed (662 high priority), 126 source-only, 21 partial, and 5 files pending PR #349.

## Review batch — 2026-11-16 17:08 UTC

- Reconciled 67 status-matrix rows after reading actual Android/iOS native project files, build configuration, resource XML, CocoaPods/Xcode wiring, OAuth contracts, and binary asset metadata at main SHA `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`: 32 source-only, 16 partial, 14 data-validated, 3 pending PR #350, and 2 pending PR #351. The existing `package.json` `FIX_PENDING_PR343` state was preserved while adding the PR #350 test-registration evidence.
- Main native build review: Android Gradle 8.13 / AGP 8.13.2 / Java 21 / SDK 36 wiring and Capacitor plugin paths align with the lockfile and Android workflow. FileProvider is non-exported and limited to app cache/files; cleartext networking is disabled. Android launcher densities are 48/72/96/144/192 px and the normal/round assets are ZIKR-branded. iOS Podfile and project deployment target both use iOS 15.0; browser/PKCE OAuth on iOS intentionally does not include the Android-only Capgo SocialLogin pod.
- **Reproducible mobile defect:** all ten Android orientation/density splash PNGs and the iOS Splash imageset display the default Capacitor blue mark on white, despite the ZIKR-branded launcher icons and Android fallback XML. Android's configured resource name `splash` selects the orientation-qualified placeholder PNGs. Draft PR #350 (current head `dc96b16e586367924116fdfa8398d348429cb240`) switches Android to a dedicated ZIKR drawable, replaces the iOS imageset reference with a copy of the existing ZIKR app icon, uses the matching navy background, and adds a canonical regression test. Legacy placeholder files are retained and no files are deleted. Quality Gate run `43914250902` passed `QUALITY_GATE=PASSED_FULL`; Android Debug APK run `43914250959` completed `BUILD SUCCESSFUL` with APK v2 signature verification; all three CircleCI contexts passed. PR remains draft pending owner/device acceptance.
- **Signing-material hygiene:** CircleCI writes its temporary release keystore under `.circleci-signing/zikr-release.keystore`; root `.gitignore` did not ignore that directory even though the job has an always-run cleanup and `android/keystore.properties` is ignored. Draft PR #351 (head `8ae3016fe7a6c9c2a4568cf8c72cde33ef91c68e`) adds a root ignore rule and extends the existing `gitignore-secrets.test.mjs`; Quality Gate run `43914454828` passed `QUALITY_GATE=PASSED_FULL` and all three CircleCI contexts passed. PR remains draft pending owner review.
- **Reminder timezone repair:** PR #349 advanced to `b085fec9a4197f33ce354c63dba43f1728f04457`; the newline-tolerant SQL privilege contract assertion now passes. Quality Gate run `43912365514` reported `QUALITY_GATE=PASSED_FULL`, including PostgreSQL reminder integration, and all three CircleCI contexts passed. The migration remains unapplied to production pending review.
- Additional review gaps recorded, not silently closed: Gradle 8.13 wrapper properties lack `distributionSha256Sum` and the wrapper JAR checksum is not verified; Dependabot only covers npm, not Gradle/GitHub Actions; iOS has no simulator/archive CI and lacks a configured Apple Development Team; the 4.7 MB `adhan.wav` could not be decoded through the repository binary endpoint, so its iOS notification duration/codec remains unverified. `salawat.wav` was verified as 13.24-second mono PCM 16-bit/22.05 kHz. No native device was used.
- Current matrix: **1,570 UNREVIEWED** (600 high priority), 157 source-only, 37 partial, 16 data-validated, 5 pending PR #349, 3 pending PR #350, and 2 pending PR #351. Matrix blob `c75970d6c5f31cff7873a2217be4642a2cf8d94c`; immutable main manifest remains `baace6d0c66ac299edb541c7caceba56eeae19be`.

## Review batch — 2026-11-17 (admin search and provider media boundary)

- PR #376 exact head `f4f37ab05f1e6b8f4fd529f1aaeb7bdcb5c69813` passed GitHub Quality Gate `43976195809`, Android Native Login Debug APK `43976197454`, and CircleCI config-guard. The admin search page now uses an any-permission server gate; service-role source queries are filtered by effective role before execution. Draft articles/stories route to admin content; video/Kids results route to the admin video console. Focused tests and the full canonical gate passed.
- PR #381 exact head `c9ef7c0c232ac1aa38168ac48db3bb5d06b77073` passed GitHub Quality Gate `43976824147`, Android Native Login Debug APK `43976824118`, and CircleCI config-guard/source-verify/application-build-docs. In addition to narration provenance, it bounds Free API JSON to 64 KiB, ComfyUI prompt/history JSON to 64 KiB/2 MiB, provider video streams to 50 MiB, aligns Hugging Face output to the Cloudinary 50 MiB contract, rejects redirects, validates Free API media host allowlists, and stat-checks rendered MP4s before reading them into memory. A stale verifier reference to `worker` was corrected to the canonical `template` variable and covered by regression.
- PR #375 exact head `de8b208fd05b2d407f1042c49926df0155640c99` remains green on Quality Gate `43962517196` and all three CircleCI contexts; Supabase Preview is skipped, not passed.
- All three code PRs remain open/unmerged with no CODEOWNERS approval. New helper/test files are PR-only and intentionally excluded from the immutable main manifest and main-snapshot matrix.
- Current production Vercel deployment remains READY on source `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`; main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` has no matching Vercel deployment. No deployment was triggered; formal post-merge smoke remains outstanding.
- No content generation, provider request, upload, social publishing, production DB mutation, Storage operation, secret/index change, Android/iOS release, merge or deployment was run.

## Verified repository and production state

- Main Quality Gate: passed on `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` (run `43833156580`).
- Main CircleCI: `source-verify`, `application-build-docs`, and `config-guard` passed on this exact SHA.
- Production Vercel deployment: `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr`, READY, deployed from `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`. Main is **4 commits ahead** of that production source. Vercel automatic Git deployments are disabled; no deploy was triggered by this audit.
- Production smoke: homepage 200; `/api/health` 200; `/api/kids/videos` 200 (empty catalog); Android `assetlinks.json` 200; `robots.txt` 200; Apple AASA 503 because `IOS_ASSOCIATED_DOMAIN_APP_ID` is not configured/valid.
- Vercel runtime error inventory showed one `TypeError: fetch failed (ETIMEDOUT)` on `/` in the prior 24-hour window; no matching runtime logs appeared in the most recent 30-minute query. It was not reproduced.
- Supabase production: 449 local migration files and 449 applied remote migrations; zero local-only or remote-only versions. All 93 public tables had RLS enabled. Four deployed Edge Functions were ACTIVE.
- The `get_push_scheduler_secret()` RPC is executable by `service_role` only; anon/authenticated cannot execute it, and neither role can CREATE in `public`. The two JWT-disabled scheduler Edge Functions use the custom secret check; `spiritual-ai` retains JWT verification.

## Open repair PRs and exact heads

| PR | Scope | Exact head | Verification |
|---:|---|---|---|
| 337 | Kids catalog reconciliation independent of external provider credentials | `75236ba6ca8bd9e3b0971d03ffa0516e9eec3b14` | Quality Gate + CircleCI passed |
| 338 | GA4 reporting status presentation | `e16bddb0dbcacb6b69194f91b548bd83aa8afc72` | Quality Gate + CircleCI passed |
| 339 | YouTube fallback publication state and catalog thumbnail reconciliation | `14160729b5e70f84987f259a454725e6e0991500` | Quality Gate `43884467828` passed with `QUALITY_GATE=PASSED_FULL`; all CircleCI contexts passed |
| 340 | Kids category-level public video RLS guard | `86b166410669b47f2984854fc3c4f364f8370c9b` | PostgreSQL 17 integration, Quality Gate + CircleCI passed |
| 341 | Complete bounded Quran-audio reference pagination for storage audit | `f1fa0e5c7c6959bfd2d0b6552c808efb72c0ee80` | Quality Gate + CircleCI passed |
| 342 | Validated offline-content snapshot manifest | `e38c9d69cb7d9ef0aac2f1992d10b96538533563` | Quality Gate + CircleCI passed |
| 343 | Production Apple Universal Links configuration guard | `68edfb6aeccd57981f0fb811443da7960e1996c8` | Quality Gate `43871761649`, Android Debug APK `43871760192`, and CircleCI passed |
| 345 | Register safe-next-path regression in the canonical test suite | `19e4cb65aaf16d3fed3229a31fcb64e950282b4` | Quality Gate `43874520989`, Android Debug APK `43874520946`, and CircleCI passed |
| 346 | Document and test private-by-default YouTube upload visibility | `2bedf9639885ac64da7e2b24d7e3e075d3c57c7a` | Quality Gate `43875597034` and CircleCI passed; production workflow explicitly overrides the default to public and requires owner policy acceptance |
| 347 | Path-aware release preflight and guarded Android manual retry | `bf215540bd52df3877154f2e0703386d09d50a55` | Quality Gate `43886674997` passed; all three CircleCI contexts passed |

| 348 | Prayer notification worker pre-send lease confirmation | `adddd660a3958cf1ade08f0c5a9533162b3bb105` | Quality Gate `43887164270` passed; all three CircleCI contexts passed |
| 349 | Enforce background-reminder timezone invariant | `b085fec9a4197f33ce354c63dba43f1728f04457` | Quality Gate `43912365514` passed `QUALITY_GATE=PASSED_FULL`; all CircleCI contexts passed |
| 350 | ZIKR-branded Android/iOS splash resources | `dc96b16e586367924116fdfa8398d348429cb240` | Quality Gate `43914250902`, Android Debug APK `43914250959`, and all three CircleCI contexts passed |
| 351 | Ignore ephemeral CircleCI signing keystore path | `8ae3016fe7a6c9c2a4568cf8c72cde33ef91c68e` | Quality Gate `43914454828` and all three CircleCI contexts passed |

All listed repair PRs remain unmerged pending independent CODEOWNERS review. PR344 is the documentation/inventory reconciliation PR. PR342 is a content-manifest snapshot, not a production database mutation.

## Background workflow findings

- Offline-content refresh run `43845944941` validated 25 datasets and pushed a branch, but the workflow token could not create its PR. PR342 was opened manually and marked ready for review after green checks. The owner must enable GitHub Actions PR creation or provide a least-privilege `GH_TOKEN` with `pull-requests:write`.
- Storage-retention run `43843404168` failed closed at the 5,000-row cap for `quran_audio.metadata`. No storage deletion occurred; owner confirmation was skipped. PR341 raises only this known inventory cap to 25,000 and retains fail-closed behavior above it.
- No content generation, Gemini call, social publication, production migration, production DB mutation, Storage deletion, Android release, or Vercel deployment was triggered by this audit.

## Owner/device acceptance still required

- `.github/CODEOWNERS` names `@Zikrmediaofficial`, but that account has no repository collaborator permission. The authenticated `zikrofficial-X` account is the PR author and cannot approve its own PR. Independent owner review is blocked until an authorized reviewer is added or CODEOWNERS is corrected.
- Branch-protection details could not be read through the connected GitHub API; do not merge until an authorized owner confirms required rules and approvals.
- The real Apple Team ID is absent from the repository. An owner must set Vercel Production `IOS_ASSOCIATED_DOMAIN_APP_ID=<TEAM_ID>.com.zikr.app`, redeploy, and verify AASA HTTP 200.
- Physical Android/iOS device acceptance, store-signed certificate comparison, iOS archive/signing, and native push/deep-link acceptance remain manual. No release was created.
- Repository-wide file review is **not complete**. The matrix explicitly marks remaining paths `UNREVIEWED` and separately tracks source-only review, regression coverage, production evidence, pending repair PRs, and owner-only gates. Continue in priority order and update statuses only from actual source and evidence.

## Post-snapshot update — 2026-11-16T13:07:49.942Z

- PR #343 corrected head `68edfb6aeccd57981f0fb811443da7960e1996c8` passed Quality Gate run `43871761649`, Android Debug APK run `43871760192`, and all three CircleCI checks. It is ready for review, unmerged.
- PR #342 is ready for review after its Quality Gate and CircleCI checks passed. It remains a manifest-only offline snapshot update.
- The status matrix has been refreshed with these exact heads and now distinguishes two partially inspected scheduler Edge Functions from fully source-read files.

## Follow-up verification — 2026-11-16T13:09:19.140Z

- Main SHA `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` now has all CircleCI statuses green: `source-verify`, `application-build-docs`, `config-guard`, and `android-release-draft`. The main Quality Gate was already green. This is verification only; no Android release was created by this audit.
- Read-only production category query: `kids-stories` has 34 published videos; 0 have null metadata, 0 lack `audience=kids`, and 0 are marked general. The category-based RLS gap is therefore latent for current data, not an observed current-row exposure. PR #340 remains the preventative fix and is unmerged.
- PR #344 documentation Quality Gate and CircleCI source/application jobs are still in progress; config guard has passed.

## Kids content and offline snapshot revalidation — 2026-11-16T13:15:47.235Z

The older ledger entries stating that 20 unapproved Kids stories were still directly public through anonymous REST, or that the current public `kids.json` snapshot exposed those 20 stories, are **superseded** by the current production evidence:

- Production `kids_content`: 65 rows, all published and active; 26 stories; 6 stories have `metadata.age_appropriate=true`; 20 legacy stories do not.
- The current production `kids_content_public_read` policy is `published=true AND is_active=true AND (type <> 'story' OR metadata->>'age_appropriate'='true')`. The corresponding migration `20261110212000_kids_content_public_read_respects_active_state.sql` is applied in the 449-version remote migration history. Anonymous/authenticated roles retain SELECT privilege, but RLS blocks those 20 unapproved stories. The share RPC is service-role-only and uses the same visibility predicate.
- Current public `kids.json`: 45 rows (35 games, 3 quizzes, 1 wudu item, 6 stories); all six stories have explicit age approval. The manifest also declares 45 Kids routes.
- `scripts/export-offline-content.mjs` filters story rows by `metadata.age_appropriate === true`; `scripts/verify-offline-content.mjs` fails if an unapproved story is present and verifies the route list exactly matches the approved dataset. The client resolver independently applies the same gate and uses offline fallback only for transient transport/server failures.
- `stories.json` contains 21 general editorial stories; it is not the Kids dataset and should not be counted as Kids stories.

No Kids content or database rows were changed during this revalidation. The 20 unapproved legacy stories remain in the database and require individual editorial review before any future approval; they are not currently public through the policy or offline snapshot.

## SEO/public routes and video-consumer trace — 2026-11-16T13:20:31.486Z

- `robots.txt`, `sitemap.xml`, `sitemap-index.xml`, `/kids`, and `/videos` all returned HTTP 200 in production. Robots disallows `/admin`, `/api`, and `/auth`, while allowing noindex pages to remain crawlable so crawlers can read their robots metadata. Sitemap generation uses the canonical `siteConfig.url`, deduplicates routes, applies `filterIndexableSitemapRoutes`, and only adds Kids story routes with `metadata.age_appropriate=true` and minimum content length. Sitemap shard IDs are parsed as non-negative integers, XML values are escaped, and shard responses carry `X-Robots-Tag: noindex`.
- The general video list, slug page, slug metadata layout, and `/api/content/videos/[slug]` all consume `getVideos`/`getVideoBySlug` through the anon Supabase client. Their metadata filters accept null/general audience but do not independently exclude `category_id=kids-stories`. The current permissive RLS policy excludes explicit Kids metadata markers but does not yet check the category join. PR #340's restrictive category-level RLS guard is therefore required for these public consumers, including the layout's metadata query.
- Current production data has 34 published `kids-stories` category videos; all 34 have `audience=kids`, with no null or general markers. This is a latent category/metadata inconsistency risk, not an observed current-row leak. PR #340 remains unmerged.
- The dedicated Kids video list, detail page, and API use `getKidsGeneratedVideos`/`getKidsGeneratedVideoBySlug`, which require automated QA, current generation-request fingerprint, a distinct human reviewer, and playable media. They do not fall back to general-video data on transient errors.

## SEO helper trace — 2026-11-16T13:22:13.767Z

- Read `src/lib/site.ts` and `src/lib/seo/sitemap-shards.ts`: canonical site URL is centralized; noindex path rules are applied before sitemap inclusion; shard count uses ceiling division; shard IDs are bounded non-negative integers; XML values are escaped; responses are cached and shard documents carry noindex headers. No focused sitemap-shard unit test was found under `scripts/tests`; no reproducible SEO defect was observed in the inspected path.

## Admin RBAC and API permission scan — 2026-11-16T13:28:56.818Z

- Fetched all 27 `src/app/api/admin/**/route.ts` files and enumerated exported HTTP methods plus authorization markers. Every route had an explicit admin permission gate, AAL2 step-up for sensitive mutations, or signed OAuth-state validation for callbacks. This was a permission-gate scan; full request validation and business-logic review of all 27 routes remains open.
- Specific high-risk paths: Kids social-written publishing requires `kids.manage`; video-generation, template, retry, create and upload paths require `video.manage` plus `kids.manage` for Kids-targeted work; social connect/callback paths require `social.manage`, step-up and signed state; media/site-audio mutations require `media.manage` and step-up; analytics requires `analytics.view`.
- `video-purge` is intentionally disabled: its POST handler returns 409 before any file or memory deletion branch. The two legacy YouTube/Facebook media endpoints return 410 after authorization. No purge/upload/publish operation was invoked.
- Role integrity: `profiles.role` updates are protected by the `guard_profile_sensitive_fields` trigger; delegated `admin_role_assignments` writes are service-role-only. `admin_update_user_role` is SECURITY INVOKER with empty search_path and EXECUTE granted only to service_role. The server action requires `users.roles` + AAL2 and blocks self-demotion; only super_admin can assign full-admin roles. Role lookup errors resolve to `user` (fail closed).
- Live grants/policies confirm authenticated users can SELECT their own delegated assignment but cannot INSERT/UPDATE/DELETE assignments; the trigger blocks direct profile role/email changes. All five relevant migrations are applied. Existing role-resolution and PostgreSQL integration tests cover these cases and the main Quality Gate is green.
- No missing route permission guard or reproducible role-escalation path was found in this scan. The remaining 66 admin page routes and full route business logic are still in the unreviewed queue.

## Admin page permission scan — 2026-11-16T13:32:45.811Z

- Scanned all **66** `src/app/admin/**/page.tsx` files against their actual source. Every page either calls `requireAdminPermission`/`requireAdminStepUp` or is an alias redirect to a destination page with its own permission guard. The shared layout calls `requireAdmin` and filters navigation by role, but it is not treated as a substitute for per-page authorization.
- Sensitive pages apply specific permissions (e.g. `kids.manage`, `video.manage`, `social.manage`, `analytics.read`, `users.read`, `security.manage`, `release.manage`, `system.manage`). Queue and dashboard pages conditionally expose sections by permission. Redirect-only legacy paths route to guarded canonical pages.
- This closes only the page permission-gate scan. Full data fetching, server actions, client mutations, and every nested component still require file-by-file review.

## Social OAuth credential security review — 2026-11-16T13:38:37.169Z

- Facebook and YouTube OAuth callbacks require admin permission, AAL2 step-up, canonical-origin handling, and HMAC-signed state bound to the initiating admin profile and provider. State expires after 10 minutes and is carried in a Secure, HttpOnly, SameSite=Lax callback cookie. Facebook verifies required page publishing scopes and resolves the configured Page across pagination; YouTube verifies channel identity and requires least-privilege upload/read/analytics scopes while rejecting full-management, force-SSL, and partner/delete-capable scopes.
- Facebook stores only the selected Page access token; YouTube stores a refresh token with granted scopes and channel ID. Both credential tables have RLS enabled, explicit anon/authenticated deny policies, revoked anon/authenticated table privileges, and service_role-only grants. Live grants/policies confirm no direct anon/authenticated token read path.
- **Security hardening observation:** token fields are plaintext at the application/database column level; no envelope/application-layer encryption was found. Supabase-managed at-rest encryption plus service_role-only access are the current protections. This is not a reproduced anon/auth privilege bypass; owner/security policy must decide whether envelope encryption and key rotation are required. Do not retrofit encryption without an owner-approved key-management and rotation plan.
- Migrations `20261028112823` and `20261028112833` are byte-for-byte duplicates (same blob SHA `4b047934470e1b23f08a0fe44548cc4c5f4700ef`) and both are applied. This is harmless migration-history duplication; do not delete or rewrite either applied migration.
- Existing tests cover Facebook scope/page pagination, credential CAS and malformed recovery, cross-platform isolation, OAuth state profile/provider binding and expiry, YouTube channel identity, least-privilege scopes, and absence of token logging. Main Quality Gate is green. No OAuth flow or social publish was triggered.

## Kids catalog reconciliation runner trace — 2026-11-16T13:43:55.158Z

- PR #337 adds `reconcileKidsCatalogMetadata()` to the social worker and calls it from `processSocial()` in `scripts/run-background-jobs.ts` **before** the external publishing gate. It is opt-in only: `SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED` defaults to `false` in the workflow and the pure helper returns disabled when unset.
- When explicitly enabled, the catalog-only reconciliation is independent of Facebook/YouTube credential readiness and still runs if the workflow later disables external publishing because Cloudinary/provider credentials are unavailable. It rechecks the current request fingerprint and human approval, uses a bounded 25-row page / 100-row ceiling / 8-attempt hold, performs CAS catalog metadata synchronization, and fails closed during a video purge. It never calls Facebook/YouTube publish APIs or generates content.
- This is an internal metadata sync and can mutate production catalog metadata when an owner explicitly enables the flag; this audit did not enable it or run the workflow. The existing Admin auto-publish and `SOCIAL_PUBLISH_ENABLED` gates still control external publishing after the catalog sync.

## Supabase Auth, Google OAuth and native callback review — 2026-11-16T13:48:58.440Z

- Production auth origin is centralized in `PRODUCTION_URL`; non-canonical production hosts redirect before PKCE verifier creation, while local loopback hosts are explicitly allow-listed and Vercel previews remain on their own deployment origin. The Google OAuth start route sets no-store headers and uses Supabase PKCE. Callback `next` values are normalized to same-origin relative paths; both the callback helper and server-action sanitizer reject external/protocol-relative destinations, and tests cover backslashes.
- The web callback exchanges the PKCE code on the origin that created the verifier. The native bridge accepts only `com.zikr.app://auth/callback?native=1` or the exact canonical HTTPS `/auth/callback?native=1` URL, rejects credentials/non-default ports, forwards the code and Supabase flow ID to the native handler, and uses `getSafeInternalPath` for the in-app destination. The Capacitor handler registers appUrlOpen, appStateChange and launch-URL listeners, exchanges the code with the saved flow ID, best-effort closes the external browser, then navigates to the safe path. The native contract test also checks Android intent filters, iOS AASA callback exclusion, plugin lockfile parity and deployment environment validation.
- `/api/auth/profile-sync` requires a valid Supabase user and is no-store. The service uses service_role but builds a constrained payload containing only the authenticated user's ID, current email, and blank-only display name/avatar fields; it does not accept role or assignment data. The profile trigger blocks non-service role/email changes. Profile update parsing constrains locale, display-name length, bio length, reciter code, daily target and IANA timezone.
- The profile sync route has no explicit rate limiter; it is idempotent and only writes the caller's profile. No cross-user write or role escalation path was found. Full profile/avatar UI consumer review remains open.
- Auth regression tests (`auth-safe-next-path`, `oauth-origin`, `native-google-oauth-contract`, `profile-sync`, `safe-redirect`, `auth-password-security`) are part of the canonical `pnpm test` script; main Quality Gate passed. No OAuth flow was initiated during this audit.

## Release, Supabase restore and media-audit review — 2026-11-16T14:28:49.058Z

- Re-read the actual contents of `.github/workflows/release-finalization.yml`, `.github/workflows/release-vercel.yml`, `.github/workflows/supabase-restore-seed-data.yml`, `.github/workflows/refresh-offline-content.yml`, `.github/workflows/audit-video-media.yml`, `.github/workflows/dispatch-android-release-recovery.yml`, `scripts/restore-quran-tafsir.sh`, `scripts/verify-supabase-db-url.py`, `scripts/verify-release-gates.mjs`, `scripts/jobs/audit-video-media.ts`, `scripts/verify-video-media-audit.mjs`, `src/features/videos/services/video-media-contract.ts`, and the related package scripts. No production workflow was dispatched.
- Reproducible Android release-gate defect: `publish-android-release-assets.yml` treated any tag ref as publish-authorized even for `workflow_dispatch`, ignoring the explicit `retry=true` input and bypassing the separate recovery workflow's retry flag, exact-source, release-notes and signed-build gates. PR347 adds an event-aware job/step gate and repeats the manual-recovery checks inside the publisher. Exact head `aac6b1654c9ce656cc4e018bb1f04baa44ecaef7`; Quality Gate run `43885652937` and two CircleCI checks were pending at this snapshot. No release was dispatched.
- PR339's catalog-thumbnail repair passed the full Quality Gate on exact head `14160729b5e70f84987f259a454725e6e0991500` (run `43884467828`, `QUALITY_GATE=PASSED_FULL`) and all three CircleCI contexts. It refreshes stale YouTube-derived thumbnails after a queue-confirmed ID change while preserving custom Cloudinary artwork.
- The earlier PR344 head `848557034730f3e7ff770b2649b323f51c7b4983` initially failed because the PostgreSQL test container shut down between integration tests; the failed job was rerun, and Quality Gate run `43879477756` then passed with `QUALITY_GATE=PASSED_FULL`. All three CircleCI contexts passed on that exact head.
- The status matrix was recomputed from **1,959** tracked file rows. Current counts: **1684 UNREVIEWED**, **688 high-priority UNREVIEWED**, **89 REVIEWED_SOURCE_ONLY**, **5 FIX_PENDING_PR339**, **2 FIX_PENDING_PR346**, and **2 FIX_PENDING_PR347**. The complete per-status counts are in the matrix.
- PR345 and PR346 have green full Quality Gate and CircleCI evidence on their exact heads; PR347's current head is still under verification. No PR has owner review or has been merged.
- No Gemini/content generation, social publishing, production DB mutation, storage deletion, Android release, Vercel deployment, or production resource change was performed.


## Review batch — 2026-11-16 17:36 UTC

- Reconciled **41** status-matrix rows against actual source and database contracts at main SHA `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`: 24 source-only, 6 production-applied migrations, 3 pending PR #352, 4 pending PR #353, plus four evidence-only updates to existing PR #341 / retention-workflow / Kids visibility rows. The immutable main manifest remains unchanged.
- Current matrix blob SHA: `5381dec435ec76a8ec76434f1386e4b3f27582da`. Counts reconcile to 1,959 file rows: 1,533 UNREVIEWED (584 high priority), 181 source-only, 37 partial, 18 production-applied, 3 pending PR #352, 4 pending PR #353, and the existing PR #341/other pending statuses.
- **Kids result review:** read all seven Kids game/share API routes, the service, validator, registry, level system, verse puzzle resolver, offline queue, share component, rate-limit identity/address helpers, focused tests, and the relevant applied migrations. Live Supabase read-only privilege checks confirm `kids_game_results` RLS enabled; authenticated SELECT allowed but INSERT/UPDATE denied; anon INSERT denied; service_role INSERT allowed; authenticated cannot execute the internal RPC and service_role can.
- **New Kids defects:** the deprecated `submit-result` endpoint minted a fresh random idempotency key for each retry without a client key; the internal result RPC also selected before inserting, so concurrent retries could race at the unique index and return 23505/HTTP 500 because the existing per-user trigger lock runs later. Draft PR #353 removes the random fallback and adds a two-key advisory lock before the duplicate lookup, plus a PostgreSQL 17 concurrency integration test. First repair head `4fb5775a110aa66d89715e1ae865f5a1746a8418` passed Quality Gate run `43917757703` with `QUALITY_GATE=PASSED_FULL`; current head `88b6560e52a3624d22cc8d4ca0145b2bbb6f3d7e` is awaiting Quality Gate `43919595999` and CircleCI `source-verify`. Its new migration is PR-only and not applied.
- **Favorites defect:** malformed UUID favorite IDs previously reached PostgREST and produced 500. Draft PR #352 adds UUID validation and focused tests. Exact head `10e50510b1873ea66b3f0bd8e22e75b072956509` passed Quality Gate `43916794764` with `QUALITY_GATE=PASSED_FULL` and all three CircleCI contexts. Owner review remains outstanding.
- **Storage/cleanup review:** read the complete 1,243-line storage cleanup script and the retention workflow. Scheduled retention runs are dry-run; apply requires manual dispatch, exact typed confirmation, and paused-writer confirmation. No cleanup was invoked. The separate legacy YouTube/Facebook cleanup route has no in-repo caller; live read-only checks found no cleanup cron, inactive sync cron, no `youtube-facebook-media` bucket, no configured cleanup secret, and zero eligible published media rows. Do not reactivate it without compare-and-set/lease and shared-path reference protection.
- **Production migration state:** Supabase remains ACTIVE_HEALTHY with 449 local / 449 remote migrations on main, exact version-set equality, latest `20261116045100`. PR #353 adds a proposed local-only migration in its branch; it has not been applied to production.
- **Open governance and acceptance:** PRs #352/#353 and this documentation PR remain drafts pending authorized CODEOWNERS review. `.github/CODEOWNERS` requires `@Zikrmediaofficial`, whose collaborator permission lookup returned null. Manual iOS simulator/device and Android device acceptance, Apple associated-domain configuration, and post-deploy smoke checks remain open.
- No production DB mutation, migration application, content generation, Gemini request, social publishing, Storage deletion, Android release, merge, Vercel deployment, or production smoke test was performed.

## Reconciled audit batch — 2026-11-16 19:52 UTC

- Repository snapshot remains main a0f51cdc3fc31503f12ddddba76e37d9e07a15f7; this audit branch changes only audit documentation.
- Authoritative matrix blob: 89b3faf15f1c2d5b8b3ab9121a2452640795cf3d. Current inventory: 1,959 tracked blobs, 1,403 still unreviewed (510 high priority), 556 reviewed; the matrix is the per-file source of truth.
- Main is five commits ahead of historical verification/deployment source 26ae58fdd2220897511544e9475eab28979f88f5. Full Quality Gate passed on PR #350/#351 heads based on main a0f51; CircleCI contexts on main pass. The production deployment last recorded READY is still associated with 26ae; not rechecked this run. vercel.json has Git deployment disabled, so deployment requires an authorized manual action after owner review.
- Read-only Supabase verification of configured project zqtssvlvmkzeeyqghqfk (Zikrofficial): ACTIVE_HEALTHY, 449 applied migrations through 20261116045100, 103 tables including storage, zero RLS-disabled tables, nine buckets. Current Kids/video policies match the reviewed migrations. No migration, DDL, DML, function deployment or storage mutation was performed.
- Current production automation: written-content generation is scheduled 15 7,13,19 UTC and uses Gemini; it creates unpublished article drafts and service-role content_publish_queue entries (+5 minutes), plus Kids social drafts from already published/active/age-appropriate stories. The AI video worker runs 17 3,9,15,21 UTC in free-only mode with BACKGROUND_JOB_TARGET=videos and VIDEO_AUTOMATION_DRY_RUN=false; this also drains all due site content queue tables (articles/stories/etc.) through CAS-guarded publication, but not external social. Social publishing is a separate 7,22,37,52 UTC workflow that can publish public YouTube/Facebook when provider credentials and database settings permit. CircleCI English-content sync runs daily at 04:17 UTC and uses Gemini plus Supabase service-role writes. Prayer dispatch is every minute; source verification is daily. None of these workflows/functions was dispatched by this audit.
- Supabase YouTube/Facebook sync cron is inactive and its Edge Function is absent; GitHub Actions is the active social publisher. The legacy cleanup route has no caller/cron and the youtube-facebook-media bucket is absent. The separate audit-video-media workflow is a daily 04:41 UTC production metadata writer; main currently ignores YouTube deletion events and overwrites custom thumbnails, while PR #339 fixes this but remains unmerged. The storage-retention workflow runs daily 02:17 UTC in dry-run mode only; manual apply requires paused writers and typed confirmation, while PR #341 adds missing Quran/audio metadata references and bounded scans.
- Kids safety: public content requires published/active and age-appropriate story state; levels require a published parent; questions are admin-only; public videos require QA, human approval, a linked request and matching hashes. Written Kids social copy and Kids videos remain blocked until human approval. PR #337 makes catalog-only reconciliation independent of provider gates but remains unmerged; main currently does not call it, and SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED defaults to false. Owner must set the GitHub repository variable to true after merge.
- Storage: videos is a public 50 MiB bucket with zero objects at the snapshot; admin upload is step-up/audit protected but has no private staging/expiry, so draft uploads are publicly readable before form save. This is a design risk, not a current exposed object. public-assets is public/empty/no current app consumer; site-audio is public with six objects and no client write policy. No objects were deleted or created.
- Supabase advisor: leaked-password protection remains disabled (owner setting); five RLS-enabled tables intentionally have no client policies (service-role-only); 79 unused-index notices were left untouched; one unindexed FK (site_audio_upload_intents.asset_id) and one multiple-permissive-policy notice (prophet_sections) remain.
- Open repair PRs: #338 (GA4 reporting status consistency; full Quality Gate 43862917014 and CircleCI pass), #337 (Kids catalog/provider-gate separation; full Quality Gate + CircleCI pass), #339 (daily production video-media audit tombstone/custom-thumbnail fix; full pass), #340 (Kids category restrictive video RLS; full Quality Gate 43868893060, CircleCI and PostgreSQL 17 integration; migration PR-only), #341 (storage-retention Quran/audio reference and pagination safety; full pass), #342 (offline manifest refresh; Quality Gate 43869724449 and CircleCI pass), #343 (iOS App ID guard; full pass and Android debug APK, owner App ID required), #345 (register auth-safe-next-path test in canonical suite; Quality Gate 43874520989, Android Debug APK 43874520946 and CircleCI pass), #346 (YouTube upload privacy documentation/test; full Quality Gate 43875597034 and CircleCI pass, runtime default already private), #347 (path-aware release checks and guarded manual Android tag retry; full Quality Gate 43886674997 and CircleCI pass), #349 (prayer timezone migration; full pass), #350 (native splash; full pass and Android debug APK), #351 (signing-path ignore; full pass), #352 (favorite UUID validation; full pass), #353 (legacy Kids result idempotency; full Quality Gate 43920546145 and CircleCI pass; migration remains PR-only). All remain unmerged pending authorized CODEOWNERS review. PR #344 remains the audit-documentation PR.
- No production publishing, content generation, Gemini request, Android release, migration, function deployment, Vercel deployment, smoke test or storage deletion was triggered.

- Android release guard note: current main recovery dispatcher can target a tag, but the publisher rejects workflow_dispatch on tag refs, so tag-based recovery is fail-closed but incomplete; no current bypass was reproduced. PR #347 adds an explicit retry=true tag path with retry flag, canonical notes, exact tag SHA, existing draft/non-prerelease release, signed android-rebuild and CODEOWNER preflight. No release was triggered.

- Storage cleanup boundary: the 02:17 UTC scheduled storage-retention run is dry-run only. Destructive apply is manual-only and requires apply=true, reference_writes_paused=true, typed DELETE_STAGING_COPIES_AFTER_REFERENCE_FREEZE, canonical project ref and safe retention RPC; site-audio cleanup has no workflow caller and requires its own explicit pause/confirmation. No cleanup apply was run.

- Kids public display trace: /kids consumes /api/kids/content, /api/kids/videos and /api/kids/social-posts. Content is published/active with age-appropriate visibility and guarded fallback; videos require QA pass, human approval, linked request and matching hashes; written posts require a published/active age-appropriate source plus published/partial queue state and platform visibility checks. Video feed/detail derive social state from the live queue, not only metadata; the earlier detail-page metadata inconsistency is no longer current. The optional PR #337 catalog mirror is not required for the public feed.
- Kids video RLS hardening: live public.videos RLS currently has a permissive metadata-based policy but no restrictive category_id guard. The canonical kids-stories category has 34 published rows and all currently have audience='kids'; no misclassified published row was observed. PR #340 adds the category-level restrictive guard and passed local PostgreSQL 17 integration; migration remains unapplied.

- Content queue trust boundary: live content_publish_queue RLS has only a service_role ALL policy; anon has no SELECT and authenticated has SQL grants but no RLS policy, so client writes are blocked. Articles and stories public SELECT policies expose only published=true. The trusted site publisher validates story approval and Kids video human approval, uses exact updated_at compare-and-set and rolls back only its own write. The video worker's target=videos intentionally invokes this site publisher for all due queue rows; social publishing remains separate.

- Admin/purge safety: `src/app/admin/system-actions.ts` gates settings changes with `settings.manage`, requires `social.manage` plus step-up for social settings, and blocks video automation toggles while `video_purge_in_progress` is set. The video-purge admin route requires `video.delete`, step-up and exact confirmation, but both files and memory scopes return 409 before any destructive branch; no purge was invoked.

- Admin permission audit: all 47 canonical navigation pages were read and each page-level permission/step-up guard matches its navigation permission; the step-up return path is same-origin `/admin` only. Kids admin controls are role-gated and the server action has exact-object Cloudinary orphan compensation with fail-closed ambiguous-outcome retention. The video-purge endpoint returns 409 for both files and memory scopes before destructive code.
- Offline/auth verification: PR #342 exact head e38c9d69cb7d9ef0aac2f1992d10b96538533563 passed full Quality Gate 43869724449 and all CircleCI contexts; it refreshes only manifest version/generatedAt. PR #345 exact head 19e4cb65aaf16d3fed3229a31fcb64e950282b4f passed Quality Gate 43874520989, Android Debug APK 43874520946 and all CircleCI contexts; it registers an existing auth-safe-next-path regression test omitted from main's canonical test command.

- Confirmed public visibility defect: five live `companions` rows are unpublished; `salman-al-farisi` overlaps the static fallback mapping and `getCompanionBySlug` returns fallback content without checking authoritative publication state. PR #362 adds the bounded service-role publication check and regression coverage; exact head f1ef2b5581efdf46b984cf5aef95e24edff0678c, Quality Gate 43938459239 in progress, not merged.

- Public API review: content/duas/hadith/tawasheeh routes use published filters and RLS; the direct companion detail fallback issue is tracked in PR #362. Contact uses a shared 5/600s HMAC rate limit; notifications and video likes are owner-RLS protected; Android APK/AAB downloads use signed GitHub assets; public site settings are limited to homepage and the live settings keys contain only public metadata; site-audio returns the 28 curated assets from a service-role-only table with no publication column.
- Residual hardening: `/api/geocode/reverse` has coordinate validation, 24-hour fetch cache and timeout but no shared rate limit for unique coordinates; `/api/content/stats` uses cookie-aware `createClient` with public CDN caching (no current unpublished hadith rows: 2,964/2,964 published); stories fallback and video-like endpoints have no separate visibility/rate-limit regression yet. No production route was invoked by this audit.

- Prayer/push review: the public prayer-location route requires authentication and uses the auth.uid-scoped RPC; push subscription intake validates bounded JSON, strict coordinates and allowlisted HTTPS endpoints, while the applied migration revokes browser access to `push_subscriptions` and grants service_role only. The notification worker uses constant-time scheduler-secret auth, bounded subscription pagination, per-delivery CAS leases, fresh preference/subscription reads and endpoint revalidation. Live Edge Function v80 is active (updated 2026-11-16T08:41:10.088Z) and cron dispatch is active every minute; no function invocation was made.
- Prayer-time external-call hardening remains open: `/api/prayer-times` and the background worker use Aladhan with caching/timeouts but no explicit shared limiter for unique locations; `/api/geocode/reverse` also lacks shared limiting. No provider request or notification delivery was triggered.

- PR #362 companion publication fix exact head `f1ef2b5581efdf46b984cf5aef95e24edff0678c` passed full Quality Gate `43938459239` (`QUALITY_GATE=PASSED_FULL`) and all CircleCI contexts; the log confirms `publication-visibility.test.ts` passed. It remains open/unmerged pending owner/CODEOWNERS review.

- Quran API review: surah catalogue enforces 114 valid records; audio requests validate reciter/surah and allow only approved MP3Quran or exact Supabase bucket URLs. No audio provider or storage mutation was invoked.
- Kids visibility review: `kids_content` has 65 published+active rows; 45 are publicly eligible (35 games, 3 quizzes, 6 age-approved stories, 1 wudu); 20 legacy stories without age approval are hidden by applied RLS and service filters. Kids video list/detail use anonymous/RLS and linked-request/current-human-approval checks.
- PR #320 merged at `b7d61b8403da914fa7abae7c447ec6ca6d3992a4`; production migrations `20261115170000`, `20261115215300`, and `20261116045100` are applied. Current live social queue has 17 Kids video rows (12 already published historically, 5 queued) plus 3 Kids written posts published. All 5 queued video requests lack human approval (2 automated QA passed, 3 QA missing); the social candidate selector and catalog policy exclude them, while RLS and Kids services hide them. No worker was invoked and no historical post was deleted.
- PR #340 category-derived restrictive Kids video RLS guard exact head `86b166410669b47f2984854fc3c4f364f8370c9b` passed Quality Gate `43868893060` and all CircleCI contexts; it remains open pending owner/CODEOWNERS review. Live Kids category currently has 34 published and 14 unpublished videos, all with `metadata.audience='kids'`; no current category/metadata mismatch observed.
- Automation policy: `generate-ai-video.yml` runs every 3h (max 4/run, daily cap 12); general site publishing can auto-publish after automated QA, while Kids public/external publication still requires human approval. `generate-written-content.yml` enables Kids generation on its schedule from approved sources. `publish-social.yml` runs every 15m and explicitly sets `YOUTUBE_UPLOAD_PRIVACY=public` (overrides the runtime private default); owner policy acceptance remains required. No workflow was triggered.
- Media lifecycle: social delivery marks staging cleanup only; Cloudinary playback masters are retained. Storage retention is dry-run on schedule and requires manual apply, paused writers, exact project and typed confirmation; no deletion was run. Daily video-media audit performs metadata reconciliation writes but no media deletion; it was not invoked.

- Auth/OAuth review: the proxy canonicalizes the production host and requires Supabase getUser on protected pages; browser client uses anon key only. Profile RLS is self/admin scoped, sensitive-field trigger blocks role/email edits, profile-creation trigger functions are not browser-executable, and `private.current_admin_role`/`is_admin_user` use empty search_path. Social OAuth state is HMAC-bound to provider/admin/redirect with 10-minute expiry and timing-safe verification; Facebook scopes/page tasks and YouTube upload/read/analytics scopes are validated; OAuth tokens are Vault-backed. Native Google callback accepts only the exact production bridge and safe internal paths. No OAuth exchange or profile mutation was performed.

- Mobile/CI review: Capacitor root config uses the production Vercel URL and disables cleartext/mixed content; Android 1.1.15/code69 uses SDK36, Gradle8.13/AGP8.13.2/JDK21, app-private FileProvider and protected CI signing context. iOS 1.1.15/build69 uses ATS restrictions, app-bound domains and associated-domain/push entitlements; Capgo SocialLogin is intentionally Android-only, with iOS browser PKCE. `ios/App/Podfile.lock` is not tracked, and iOS Xcode signing/device/App Store acceptance remains manual.
- CI/CD review: CircleCI release rebuild requires `android-signing` context and exact release branch/tag; GitHub Android release/recovery and production finalization workflows are protected/manual. Production finalization is the only authorized workflow that runs Supabase migrations/data restore, Edge Function deployment, Vercel deployment and smoke checks; it was not triggered.
- Vercel read-only state: project settings show Node22, `pnpm install --frozen-lockfile`, `pnpm build`, production branch main and `git.deploymentEnabled=false`; no root `vercel.json` exists. Latest production deployment `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr` is READY on commit `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`. Main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` is 4 commits ahead (6 files changed, all social worker/catalog reconciliation/tests/verifiers; no public page source file in that diff). No deployment was triggered.
- Runtime monitoring: Vercel aggregated 7 `TypeError: fetch failed` / `ETIMEDOUT` events affecting 7 users over 24h on `/` and `/quran/[surah]/[ayah]`; 3 recent logs were GET `/` in iad1/sfo1. Inspected homepage/site-content/articles and Quran local-corpus/tafsir loaders catch network errors and use fallbacks; no unhandled 500 was confirmed. Homepage HTML was reachable; API/route smoke endpoints could not be independently fetched, so full production smoke remains pending.

- SEO/public route review: `robots.ts` allows crawling of public noindex pages while disallowing only admin/api/auth. `sitemap.ts`, sitemap index and shard routes use canonical origin, bounded shards, XML escaping and the shared noindex filter. `/kids` and `/kids/adventures` layouts use `pageMetadata` without noindex and are intentionally indexable; approved age-appropriate Kids story details are included separately. PR #371 was closed without merge after the proposed noindex change was disproved by actual layout metadata; no code change was merged.
- AASA/Android association: the iOS Apple App Site Association route returns 503 until the owner configures the real Apple Team ID plus `.com.zikr.app` in Vercel Production and redeploys. Android assetlinks route has a release fingerprint fallback and environment override; Play App Signing fingerprint acceptance remains owner/device verification.


## Prayer-times provider request-boundary review — 2026-11-16

- Main snapshot remains `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; recursive manifest remains 2,459 entries / 1,959 blobs / 500 directories and is unchanged (blob `baace6d0c66ac299edb541c7caceba56eeae19be`).
- Read the complete public `/api/prayer-times` route, prayer-times client service and regression test, shared contact HMAC identity helper, trusted proxy-address helper, existing service-role rate-limit service and RPC migration, and the direct Aladhan caller in the prayer notification Edge Function.
- Reproduced a cache-bypass exposure on main: the API validates inputs and caches identical Aladhan URLs for one hour, but unique coordinates/cities/addresses create distinct upstream requests without a shared caller quota. The client-side cache is per process and does not protect the serverless route across users or instances.
- PR #372 adds `src/features/prayer/services/rate-limit.ts`, enforces 30 requests/client/60 seconds with the existing atomic `consume_admin_rate_limit` RPC and HMAC-derived UUID, returns 429 with Retry-After, and fails closed with 503 before upstream fetch. The new file is PR-only and is not added to the immutable main manifest.
- PR #372 exact head: `31a8ae1fac58d02709f054a0361ed902da1807c5`; base `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; 3 commits ahead, 0 behind, 3 files changed. Exact-head GitHub Quality Gate run `43957292407` passed with `QUALITY_GATE=PASSED_FULL`; CircleCI source-verify, application-build-docs and config-guard all passed. Owner/CODEOWNERS review remains outstanding. Owner/CODEOWNERS review remains outstanding.
- The background worker fetches Aladhan directly only when its DB schedule cache misses and processes the bounded batch sequentially. A provider-wide quota for that separate trusted worker path remains a distinct open risk; this PR does not claim to solve it.
- PR #356 Nominatim repair exact head `1c7cf83f44e8b10670098ca15aa34b2d536b8f8d` passed full Quality Gate run `43934145528`, CircleCI source/application/config and Android Debug APK run `43934145480`; it remains draft/unmerged pending owner review.
- Matrix counts are now 1,344 UNREVIEWED (479 high priority), 53 REVIEWED_PARTIAL, and 615 rows in reviewed/pending categories. The manifest is unchanged. No migration, production RPC, provider request, notification delivery, content generation, Gemini, social publishing, storage operation, release, deployment or production smoke was performed.


## Prayer worker authentication preflight review — 2026-11-16

- Read the complete 1,062-line `supabase/functions/prayer-notification-worker/index.ts` in contiguous chunks and its direct imports: pagination, eligibility, time-zone conversion, schedule normalization, push endpoint allowlist, async serial queue and delivery lease heartbeat. Traced the DB schedule-cache reads/upserts, scheduler-secret RPC, delivery planner RPC, claim/finalize CAS, fresh preference/subscription reads, endpoint validation and push-send boundary.
- Reproduced a small but concrete public Edge Function request-cost gap: `verify_jwt=false` is intentional, but missing/malformed Authorization headers reached the service-role `get_push_scheduler_secret` RPC before returning 401. The source-verified content agent already rejects an empty bearer before its equivalent RPC.
- PR #373 adds strict non-empty `Bearer <token>` preflight before the secret RPC, rejects empty secret state, preserves constant-time comparison for valid-looking bearer tokens, and adds an assertion to the existing canonical worker regression test.
- PR #373 exact head `c603ee90a07f86ff07f17c23e4a65ca9f130cc2b`, base main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`, 7 commits ahead / 0 behind, 5 files changed. It now also corrects the worker's Dubai method ID (8 → 16; Gulf remains 8) and the exported client label map, with regression assertions. The expanded exact head passed GitHub Quality Gate run `43958916618` with `QUALITY_GATE=PASSED_FULL` and CircleCI source-verify, application-build-docs and config-guard. The previous auth-only head also passed its full gate. Owner/CODEOWNERS review remains required.
- Worker/test matrix rows are now `FIX_PENDING_PR373`; no source file was added to the immutable main manifest. The manifest remains unchanged at blob `baace6d0c66ac299edb541c7caceba56eeae19be`.
- Counts after reconciliation: 1344 UNREVIEWED (479 high priority), 51 REVIEWED_PARTIAL, 53 REVIEWED_REGRESSION_COVERAGE, 2 FIX_PENDING_PR373, and 615 rows not marked UNREVIEWED.
- No Edge Function invocation, scheduler-secret RPC, notification delivery, schedule planning, production database mutation, migration, content generation, Gemini request, social publishing, Storage operation, release, merge, deployment or production smoke was performed.


## Prayer calculation-method mapping review — 2026-11-16

- Read the complete prayer-times service, its page and hook consumers, saved-location and coordinate helpers, HTTP retry helper, and the complete prayer notification worker plus its direct imported modules.
- Confirmed via the live official Aladhan `/v1/methods` response that `GULF.id = 8` and `DUBAI.id = 16`. Main's worker mapped `dubai` to 8, so a persisted Dubai preference would schedule background reminders using Gulf Region timings. The exported client method-label map also mislabelled IDs 1–3 and 8–32.
- PR #373 was expanded on the same audit branch to add a pure calculation-method resolver, correct `dubai -> 16` and `gulf/gulf-region -> 8`, align client labels to the official IDs, and add assertions to both canonical prayer test files. Exact head: `c603ee90a07f86ff07f17c23e4a65ca9f130cc2b`; 7 commits ahead / 0 behind; 5 files changed.
- The previous auth-only head passed `QUALITY_GATE=PASSED_FULL` and all CircleCI checks, but the expanded exact head requires a fresh run. Owner/CODEOWNERS review remains outstanding.
- Additional prayer client files were reviewed at source level; statuses are partial where imported UI/audio/notification or route dependencies remain open.
- Counts after this pass: 1307 UNREVIEWED (451 high priority), 62 REVIEWED_PARTIAL, 287 REVIEWED_SOURCE_ONLY, 4 FIX_PENDING_PR373, 652 rows not marked UNREVIEWED. The immutable main manifest is unchanged.


## Live Supabase reconciliation — 2026-11-16

- Supabase project `zqtssvlvmkzeeyqghqfk` is ACTIVE_HEALTHY, PostgreSQL 17.11.0.018. Read-only `list_migrations` returned 449 applied versions through `20261116045100`; the main manifest has 449 migration files. Exact version comparison: 449 shared, zero local-only, zero remote-only, zero duplicate IDs; one descriptive-name mismatch on shared version `20261106213918` only.
- `save_default_prayer_location` is present in production from migration `20261114040000`; prior “missing deployed contract” notes are historical and superseded. Its SECURITY INVOKER/empty-search_path ACL is authenticated + service_role, not anon.
- Prayer-related RLS and RPC ACLs were checked read-only; no production DDL/DML or function invocation occurred. Deployed prayer worker v80 still contains the two PR #373 defects; no deployment was performed.

- Video automation review: `generate-ai-video.yml` runs 17 03,09,15,21 UTC (4/day), with `VIDEO_FREE_ONLY=true`, provider order `hf_ltx_fast,hf_wan,template`, `FREE_VIDEO_PROVIDER_ENABLED=false`, `COMFYUI_ENABLED=false`, no Gemini API key, max4/run, target20/day, cap24, worker concurrency2. Arabic voice uses Edge TTS + gTTS fallback; Quran requires verified recorded recitation. `BACKGROUND_JOB_TARGET=videos` does not call external social publisher but does process due internal `content_publish_queue` entries. The separate 15-minute social workflow checks OAuth scopes, uses public YouTube privacy and retains Kids human approval. No generation, TTS smoke, provider request or social publishing was triggered.
- Queue/lease/QA review: video claims use exact-row CAS, leases renew serially and abort on loss, quota reserves slot keys, pause/purge settings fail closed, QA precedes catalog and social handoff. The free API provider is disabled in production workflow; its returned video URL lacks a dedicated host/redirect allowlist and remains a defense-in-depth hardening item. HF output download is limited to trusted Hugging Face origins and 256 MiB, with MP4 signature validation.
- PR #374 exact head `32894db0fdf7e7abbb456879e45669ada9964335` adds `is_approved=true` and `user_id IS NULL` to service-role video story reads; the new regression test is registered in `pnpm test`. Exact-head GitHub Quality Gate (`pnpm verify:pr`), Android Native Login Debug APK and CircleCI config-guard all passed. PR remains open/unmerged for CODEOWNERS/owner review; no production data changed.


## Review batch — 2026-11-16 current checkpoint

- Admin route/permission review read the server-filtered navigation, delegated role permission map, dashboard visibility, live overview API, content console/actions, content scheduling/timezone/cancellation services and tests, site-audio UI/routes and live FK contract. Site-audio upload/primary/delete remain step-up protected; `site_audio_upload_intents.asset_id` uses `ON DELETE SET NULL`, so shared-reference restoration is consistent. Content scheduling rejects timezone-less timestamps and DST gaps; queue cancellation uses monotonic row-version CAS and fails closed.
- **Reproducible admin permission defect:** `/admin/search` required `content.manage`, then used service-role reads across videos, hadiths, duas and content_library without checking `video.manage`, `knowledge.manage` or `library.manage`. Delegated SEO/moderator/content roles could receive results from modules they could not open. Draft PR #376 adds a role-to-source permission map, filters sources before issuing queries, passes the effective role from the page, and adds role/wiring regression tests registered in `pnpm test`. Exact head `56360bdb48d39b44f6a13c4b50b8f52070d32f12`; Exact-head Quality Gate run 43962549748 and Android Debug APK run 43962549480 passed; CircleCI config-guard passed. Owner/CODEOWNERS review remains pending. No merge or production change.
- Content schedule cancellation was verified against its worker lease CAS, DST and stale-version tests; no schedule was created or cancelled. Site-audio storage was not uploaded or deleted.
- PR #374 video story-source approval filters passed exact-head Quality Gate (`pnpm verify:pr`), Android Debug APK and CircleCI config-guard on `32894db0fdf7e7abbb456879e45669ada9964335`; owner/CODEOWNERS review remains pending.
- No content generation, Gemini, TTS smoke, provider call, social publishing, admin mutation, production DB write, upload, storage cleanup, media deletion, native release, merge or deployment was triggered.


## Review batch — 2026-11-16T21:46:04.909Z

- Read actual Supabase Edge Function sources `_shared/cors.ts`, `_shared/islamic-ai.ts`, `health/index.ts`, `spiritual-ai/index.ts`, `source-verified-content-agent/index.ts`, and `source-verified-content-agent/parse-items.ts`, plus `supabase/config.toml`, the source-agent parser test, and the scheduler migration defining the private database-backed secret. CORS and Islamic-AI fallback consumers were traced; the parser is intentionally skip-only until provider-specific parsers are reviewed.
- Reproduced a source-agent auth preflight defect: malformed non-empty Authorization values such as `Basic …`, a raw token, or extra token text reached the service-role `get_push_scheduler_secret()` RPC before rejection. PR #375 adds a bounded strict Bearer parser, lazy secret-reader invocation, fail-closed handling and regression assertions in the existing `pnpm test` suite. Exact PR head: `de8b208fd05b2d407f1042c49926df0155640c99`; helper blob `84f57306b4acfe91eeaee22859e4ca8933278216`; changed entrypoint blob `23fcd2260d55b013775587b8588931fa019a858b`; changed test blob `ee059f7cda4a62b73088973c06d8f1e07686b2cb`.
- PR #375 exact-head CircleCI `config-guard`, `source-verify`, and `application-build-docs` all passed. GitHub Quality Gate run `43962517196` remains in progress; Supabase Preview is skipped (not a pass). Owner review notification comment `6930245521` is posted; no approval is present.
- Read admin health/dashboard permission and count paths; source layout filters navigation by effective role, page/API guards remain in place, and queue availability is rendered as unavailable rather than zero. The global admin-search service-role permission leak found in the concurrent review remains tracked separately as PR #376, exact head `56360bdb48d39b44f6a13c4b50b8f52070d32f12`; this pass did not overwrite it.
- Main snapshot and immutable manifest remain anchored to `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; PR-only helper is not inserted into the main manifest until merge. Current status: 1278 UNREVIEWED files (435 high priority); 681 other file rows have a non-UNREVIEWED status.
- No production function, database, cron job, content source, provider, social publisher, storage object, Android release, merge or deployment was touched.


## Exact-head verification update — 2026-11-16T21:47Z

- PR #375 exact head `de8b208fd05b2d407f1042c49926df0155640c99` passed GitHub Quality Gate run `43962517196`; the job's canonical source/architecture gate, Supabase Edge Function Deno type-check, and all PostgreSQL 17 integration steps passed. CircleCI `config-guard`, `source-verify`, and `application-build-docs` all passed. Supabase Preview was skipped and is not counted as a pass.
- PR #375 remains open/unmerged because the required CODEOWNERS owner approval is absent; explicit notification comment `6930245521` is posted. No deployment or production function/cron invocation occurred.


## Owner-review gate update — 2026-11-16T21:48Z

- PR #375 exact head `de8b208fd05b2d407f1042c49926df0155640c99` remains fully green for GitHub Quality Gate and all CircleCI contexts. Supabase Preview is skipped. The automated Codex code review could not complete because the connected review account reached its usage limit (comments `6930220352` and `6930221109`); this is not a pass or a code finding. Human CODEOWNERS approval remains outstanding despite explicit owner notifications `6930245521` and `6930399909`.
- No merge, production function/cron invocation, database mutation or Vercel deployment was performed.


## Review batch — admin analytics and knowledge publishing — 2026-11-16

- PR #377: the optional `/admin/analytics` traffic panel could fail the entire page if `getTrafficRevenueSnapshot()` throws during service-role client initialization. Exact head `aebf778509bbdd8daef1589ecbd6a111339f3029` passed canonical Quality Gate run `43965088015`, Android Debug APK `43965089158` and CircleCI config-guard. It now renders an accessible unavailable state rather than failing the page or fabricating zeroes; no GA4/YouTube request was run.
- PR #378: new knowledge records previously defaulted to published; server actions did not enforce source/reference/grade on publication; scholar editor lacked a source field; companion/scholar slug edits could POST an existing ID and fail. Exact head `db567da1899ed9994cbc2bd1c773b878c3f62823` adds draft defaults, server publication policy, source metadata, PATCH-by-ID and tests; Quality Gate run 43966305899 and Android Debug APK run 43966303793 passed; CircleCI config-guard passed. Owner/CODEOWNERS review remains pending.
- Read-only production counts: 12/17 published companions and 8/8 scholars lack metadata.source; all 2,964 published hadiths have both ref and grade. No records were updated. Legacy biography source remediation remains owner/editor work.


## Review batch — prophet and battle metadata concurrency — 2026-11-16

- Read the full admin prophets/battles pages and services, permission/step-up gates, YouTube ID parser, and live table schema/RLS. Both services read JSON metadata, merge the YouTube ID and updated by ID only; a concurrent metadata update could be overwritten. Publish toggles also reported success when zero rows matched, and direct post-commit audit failures could make a committed action appear failed.
- PR #379 exact head `0f4ada7d23116bc0c367d0bce10b4aede3fc6f9e` adds `updated_at` compare-and-set (including nullable timestamps), verifies returned rows for metadata/publish updates, narrows JSON metadata and wraps post-commit audit. Quality Gate and Android Debug APK are in progress; CircleCI config-guard passed. No production mutation.
- Live schema read: `prophets.updated_at` and `battles.updated_at` are nullable with `now()` defaults; authenticated write RLS requires `private.is_admin_user()`. No rows were changed.


## Review batch — YouTube feed synchronization and Supabase cache schema — 2026-11-16

- Read full `src/features/videos/integrations/youtube.ts`, its `/videos` server-render consumer, the YouTube cache schema migration and historical no-op migration, and the expanded playlist/cache regression suite. The original singleton sync lock used an unconditional upsert after a cooldown read, so concurrent requests could both call YouTube; final upserts could overwrite a newer attempt. PR #380 exact head `66dde1c4279b6513e395a57ab906b4117a8e82ad` adds updated_at CAS claim, handles first-insert conflict as lost claim, and scopes finalization to the exact channel/attempt timestamp. Quality Gate `43969510424` and CircleCI config-guard/source-verify/application-build-docs passed. PR remains draft/open for owner review; no provider request or DB mutation.
- Read both `20260828000001_youtube_feed_cache_history.sql` (intentional no-op preserving a transient version) and `20260828000003_youtube_feed_cache.sql` (cache/sync-state schema). Later applied migration `20261101135000` revokes client access and drops the public sync-state policy; live `youtube_sync_state` is service_role-only, while public video cache remains public-read. Both versions are in the exact-matched remote history.


## Review batch — narration and provider-download boundary — 2026-11-16/17

- PR #381 current exact head `9786fb84f61df4674cda883b472ea7df1d9c1b21` includes server-side ownership checks for Cloudinary narration, canonical Quran URL validation, redirect rejection, 15 MiB streamed narration cap, and provider download limits. The provider path now bounds Free API JSON to 64 KiB, ComfyUI prompt JSON to 64 KiB, history JSON to 2 MiB and output video to 50 MiB; Hugging Face output is capped at 50 MiB. Media response bodies are streamed and cancelled on overflow. Free API returned media URLs are limited to the configured endpoint or explicit CDN allowlist; redirects are rejected.
- Current PR #381 exact-head checks: GitHub Quality Gate `43976532247` pending; Android Native Login Debug APK `43976532354` in progress; CircleCI config-guard passed; source-verify/application-build-docs pending. Earlier head `5eb658f...` had source-verify failure; current head is not yet verified. No provider request, generation, TTS/Gemini, Cloudinary upload/delete, social publishing or production mutation was performed.


## Review batch — 2026-11-17 (admin video, template registry, prayer worker config and Kids RLS)

- Read the complete admin video request client and template studio client. Traced list/detail/retry/approval/purge consumers and template GET/POST actions. General video managers are filtered from Kids rows; Kids mutations/previews require kids.manage bound to the same admin. Video-template approval enforces a distinct reviewer and post-commit audit. Preview requests set templatePreview and skipSocialPublish; no preview was triggered.
- The purge UI is intentionally disabled. The server-side /api/admin/video-purge route returns 409 before lock acquisition, Cloudinary/Storage inventory, or any database mutation for every valid scope; no purge was invoked.
- Read template registry migrations 20261106010000, 20261106020000, 20261106061131 and 20261106090800. Remote migration history contains all versions. Read-only live checks confirm service_role-only RPC execution, SECURITY INVOKER/empty search_path, required service_role table privileges, the three template actor-FK indexes, and service-only social_post_insights RLS/ACL/index. The conditional youtube_sync_state redaction target row id=1 is absent; no claim is made that the update changed a row.
- Read prayer worker deno.json and entrypoint. Direct dependencies are pinned; no deno.lock exists in the function directory. Worker auth and Aladhan Dubai method fixes are tracked in PR #373 exact head f7897608e4d67d988fb7151c1d70dff1636faac9; Quality Gate 43964591529 and all three CircleCI contexts passed. No Edge Function was invoked or deployed.
- Read applied Kids read-policy migration 20261114210000 and inspected live RLS. The database currently has only permissive videos_public_read and no category-based restrictive guard. Kids category has 49 rows / 35 published; all 35 published rows carry audience='kids'. PR #340 exact head 86b166410669b47f2984854fc3c4f364f8370c9b adds the missing restrictive category guard; Quality Gate 43868893060 and all three CircleCI contexts passed. Owner/CODEOWNERS review is absent and migration remains unapplied.
- Current matrix blob: `0c53cb076f40a8287be77c96a2724617eee339fa`; main manifest remains immutable at `baace6d0c66ac299edb541c7caceba56eeae19be`. Matrix now records 1219 UNREVIEWED files (387 high priority), 740 non-UNREVIEWED rows and 738 reviewed/non-historical blobs.


## Review batch — 2026-11-17 (initial Supabase migration chain and project lineage)

- Read 19 high-priority SQL files from their actual contents: archived 2024/2025 markers, the initial 2026 schema/content/RLS/video migrations, inactive Kids legacy SQL, Kids game modernization, and coordinated legacy retirement. The active migration path and current production remote ledger match exactly: 449 local files / 449 remote versions, zero missing versions; one descriptive-name mismatch only for version `20261106213918` (local `video_likes`, remote name `20261106214000_video_likes`).
- Current production Supabase project is `zqtssvlvmkzeeyqghqfk` (created 2026-11-06, ACTIVE_HEALTHY, PostgreSQL 17.11); Vercel production `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` both point to this same project.
- Live RLS review confirmed: old broad authenticated video/category write policies are absent; Kids content and prophet sections have publication/age gates; profile role/email changes are blocked by the live guard trigger; public `site_settings` currently has no secret-like field names; Quran audio is served through a server-only service-role path. The remaining Kids category-derived video read guard is PR #340.
- Current project counts: 1 auth user/profile, 13 kids_games, 65 kids_content, 1,170 kids_game_levels, 11 kids_achievements, 0 kids_game_questions, 0 progress rows and 0 result rows. Historical Phase 3/15/18 documents refer to different Supabase project IDs; do not treat their counts as current or as proof of transfer.
- Two applied migrations contain historical `DROP TABLE ... CASCADE` resets without row-copy logic: `20260530000200` and `20260929070000`. They are marked `HISTORICAL_DESTRUCTIVE_REVIEW_REQUIRED` for owner confirmation of old-project data retention/transfer; no restore, replay or reversal was attempted. The inactive legacy `game_scenarios` SQL has malformed `DO $` delimiters and no active runtime consumer; it was not applied.
- Current matrix blob: `fcbcfcbf253800caa173a4591889774a63a6ef7b`; current Supabase ledger blob: `91cedccc9edcc4f75b956e3e93faaa0688298b4a`; main manifest remains `baace6d0c66ac299edb541c7caceba56eeae19be`. Counts: 1219 UNREVIEWED (387 high priority), 740 non-UNREVIEWED rows, 738 reviewed/non-historical blobs.


## Review batch — 2026-11-17 (public Stories visibility and migration replay safety)

- Read the complete Stories service, curated fallback dataset, public Stories index/detail routes, global-search service and the active `search_public_content` SQL function. The RPC is SECURITY INVOKER and filters stories by published, approved and global ownership. The public list/detail/search fallback path had a separate gap: a successful empty database response or a mixed response containing any non-public row returned the hard-coded fallback catalogue. That could resurrect a stale static copy after a story was unpublished, unapproved or made user-owned. PR #390 stacks on PR #386/#374 and now filters public rows before mapping and preserves a successful empty result as empty. Exact head `c31659453b3fec443444266e9c14d905fbb9a930`; Quality Gate `44005956230` was in progress, CircleCI config-guard/application-build-docs passed and source-verify remained pending at the last poll. No production row was changed.
- Read the complete service-role video-source resolver and all four story query paths. PR #374 exact head `32894db0fdf7e7abbb456879e45669ada9964335` adds `is_approved=true` and `user_id IS NULL` to resolver/list/fallback reads. Quality Gate `43959124758`, Android Debug `43959124757`, and all three CircleCI contexts passed. No video generation or provider call was run.
- Read the Stories RLS migration, public visibility helper and PostgreSQL integration fixture in PR #386. Exact head `0c8ff121184992fc7bad19c284a78a795f1beabe` passed Quality Gate `43992250576`, Android Debug `43992250671` and all three CircleCI contexts. Its migration is still unapplied and requires owner/CODEOWNERS review.
- Read the migration-version selection block in `scripts/validate-migrations.mjs`. It previously used a content-score heuristic to silently skip one of two files sharing a numeric version. Main's immutable manifest contains 449 active migration files with 449 unique version prefixes. Open PR #386 and PR #387 each add a different `20261117010000_*.sql` migration; if combined, one security migration could be skipped by the validator (or rejected by the Supabase CLI). PR #391 adds a fail-closed uniqueness guard and a regression for the exact collision. Exact head `4a9c9a9cbdad8ef0b853947b76555ad957ddb84b`; Quality Gate/Android were queued, CircleCI config-guard passed and source-verify/application-build-docs were pending at the last poll. No migration was applied.
- PR #387 exact head `a23e7565695e119a329d67234681fa74fa41d9c2` and dependent PR #388 exact head `02b3f1526f57dbfddc26293b38129b7d00c6de2f` each passed their recorded Quality Gate, Android Debug and CircleCI checks. Their migrations remain unapplied. PR #388's Stories RLS migration is a second proposed hardening path; coordinate it with PR #386 rather than merging both migration sets without version reconciliation.
- PR #375 current exact head is `e4b42e6d331ed9ee3d91207b9ecbd96ea3611291` (supersedes the stale `de8b208...` reference in earlier snapshots). Quality Gate `44004161657` and all three CircleCI contexts passed. It adds a shared scheduler Bearer preflight used by the source-verified agent and prayer worker. PR #373 exact head `f7897608e4d67d988fb7151c1d70dff1636faac9` also passes Quality Gate `43964591529` and all CircleCI contexts, but changes the same prayer worker to add Dubai method ID 16. The two branches must be consolidated/rebased before merge; neither was merged or invoked.
- PR #376 exact head `f4f37ab05f1e6b8f4fd529f1aaeb7bdcb5c69813` passed Quality Gate `43976195809`, Android Debug `43976197454` and CircleCI; PR #384 exact head `f1d3cd43762ee47e7f0fbf19c4c9bb98ec99c868` passed Quality Gate `44002881276` and CircleCI. Both remain open/unmerged for owner review.
- Current immutable main snapshot remains `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; manifest blob `baace6d0c66ac299edb541c7caceba56eeae19be`; 1,959 tracked blobs and 500 directories. Current matrix blob `a770d973af13c64c8ebfa683ad5555ea0e6ecd32`: 1,215 UNREVIEWED (387 high priority), 744 other status rows, 742 reviewed blobs by the snapshot counter, and 740 reviewed/non-historical blobs excluding the two historical destructive-review rows. The matrix, not earlier status snapshots, is the current file-status authority.
- No production database mutation, migration apply, Edge Function/Cron invocation, content generation, Gemini request, social publishing, Storage operation, release, merge or deployment was performed. Owner/CODEOWNERS review and device/production acceptance remain open.


## Checkpoint refresh — 2026-11-17 03:00 UTC

- Matrix blob is now `bd91a5498fac2e808327295bd16169d9176cd487`; the immutable main inventory remains 1,959 tracked blobs / 500 directories, with 1,215 UNREVIEWED (387 high priority), 744 other statuses, 742 reviewed blobs by matrix counter and 740 reviewed/non-historical excluding the two historical destructive-review rows.
- PR #390 exact head `c31659453b3fec443444266e9c14d905fbb9a930` completed successfully: Quality Gate `44005956230` reports `QUALITY_GATE=PASSED_FULL`, the Stories regression reports `STORIES_PUBLIC_RLS_TEST_PASSED`, and CircleCI config-guard/source-verify/application-build-docs all passed. This closes the code/test repair for stale static Stories fallback on successful empty or mixed non-public responses, subject to stacked dependency integration and owner review.
- PR #391 exact head `e7e2df894f69b678d17b82211d5a12f9de17f52e` corrects the first attempt's double-escaped numeric regex. The prior head `4a9c9a9cbdad8ef0b853947b76555ad957ddb84b` failed the new regression (not a bypass); the new Quality Gate `44006861723` and Android Debug `44006861706` were queued, with CircleCI contexts pending. Do not count the new head as verified until all checks complete.
- Read-only Vercel state: project `zikr` (ID `prj_bnBQb7DIXB5iE2mZJAghtAoZuKGs`) latest production deployment `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr` is READY on source commit `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`, with alias `zikrmediaofficial.vercel.app`. Current main remains `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; no production deployment for that SHA was found in the recent deployment list. No deployment or production smoke test was run.
- No production migration, DB write, Edge Function/Cron invocation, content generation, Gemini request, social publishing, Storage operation, release or merge was performed. Owner/CODEOWNERS and physical-device acceptance remain open.


## Checkpoint refresh — 2026-11-17 03:05 UTC

- Matrix blob: `6ea50703c275839aa4dd473df4dc9337c33f101a`; immutable main remains 1,959 tracked blobs / 500 directories. Counts: 1,214 UNREVIEWED (386 high priority), 745 other status rows, 743 reviewed blobs by matrix counter, 741 reviewed/non-historical excluding the two historical destructive-review rows.
- PR #391 exact head `e7e2df894f69b678d17b82211d5a12f9de17f52e` now passes Quality Gate `44006861723` with `MIGRATION_VERSION_UNIQUENESS_PASSED` and `QUALITY_GATE=PASSED_FULL`, Android Debug `44006861706`, and all three CircleCI contexts. The earlier head failed the new regex test; the correction was committed and the new exact head passed. The guard now rejects duplicate migration versions instead of silently skipping one.
- New finding in the complete prayer push scheduler migration: `scheduler_secret` was generated as `md5(random() || clock_timestamp() || current_database())`, which does not add entropy beyond PostgreSQL's PRNG. Both Edge Functions and the pg_cron dispatcher retrieve the secret dynamically through `get_push_scheduler_secret()`. PR #392 exact head `ad052b8c3af001729ae0c208a123f11681e6c986` adds a conditional, idempotent rotation to 64 lowercase hex characters using two `gen_random_uuid()` values and a postcondition; it touches only the `scheduler_secret` row. Quality Gate `44007532669` and Android Debug `44007532622` were in progress; CircleCI config-guard passed, source-verify/application-build-docs pending. No production migration was applied.
- PR #390 Stories fallback fix remains green at exact head `c31659453b3fec443444266e9c14d905fbb9a930`: full Quality Gate `44005956230` and all CircleCI contexts passed.
- Read-only Vercel state remains: latest production deployment `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr` is READY on old source `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`, not current main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`. No deployment or production smoke test was run.
- No production migration/DB write, Edge Function/Cron invocation, content generation, Gemini request, social publishing, Storage operation, release, merge or deployment was performed. Owner/CODEOWNERS and device acceptance remain open.


## Checkpoint refresh — 2026-11-17 03:07 UTC

- Matrix blob: `3a59585b0185f0f3453017459e6934ea1dbf3ca8`; immutable main remains 1,959 tracked blobs / 500 directories. Counts remain 1,214 UNREVIEWED (386 high priority), 745 other statuses, 743 reviewed blobs by matrix counter and 741 reviewed/non-historical excluding two historical destructive-review rows.
- PR #391 exact head `e7e2df894f69b678d17b82211d5a12f9de17f52e` passed full Quality Gate `44006861723`, Android Debug `44006861706`, and all CircleCI contexts. The canonical log includes `MIGRATION_VERSION_UNIQUENESS_PASSED` and `QUALITY_GATE=PASSED_FULL`.
- PR #392 current exact head `9d81f5235c0c11802c6062db574f49b4cf673a9f` corrects the first test attempt, which omitted the empty-string third argument to SQL `replace()`. The previous head `ad052b8c3af001729ae0c208a123f11681e6c986` failed that focused assertion; the new head is queued/pending: Quality Gate `44007904007`, Android Debug `44007904002`, and CircleCI contexts pending. No pass is claimed yet and no production migration was applied.
- PR #390 remains green at exact head `c31659453b3fec443444266e9c14d905fbb9a930`: full Quality Gate `44005956230` and all CircleCI contexts passed.
- No production database mutation, cron/Edge Function invocation, content generation, Gemini request, social publishing, Storage operation, release, merge or deployment was performed.


## Checkpoint refresh — 2026-11-17T03:24 UTC

- Immutable main snapshot: `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`; tree `7a73fa9af3ae0de67275dd33c4a1f8f18038d909`; 1,959 tracked files and 500 directories. Manifest blob remains `baace6d0c66ac299edb541c7caceba56eeae19be`; current file-status matrix blob is `e7199853e8ba0b48a67162227c35cfd27b4fce03`.
- Matrix counts after this review batch: 1205 UNREVIEWED (377 high priority), 76 REVIEWED_PARTIAL, 752 reviewed blobs by the matrix counter. Nine previously unreviewed high-priority migrations were read in full and moved to REVIEWED_PARTIAL; their downstream consumers are still open.
- Live Supabase project `zqtssvlvmkzeeyqghqfk` is ACTIVE_HEALTHY on PostgreSQL 17.11 with 449/449 migrations applied through `20261116045100`. Read-only checks confirmed the current prayer, content, Kids, prophet-section and video table RLS contracts; no migration was applied.
- The current `quran_audio` contract is public playback metadata, not a private bucket: the `quran-audio` bucket is public and all 19,608 live rows are external with no populated Storage URL/path. However, browser roles still have broad effective column access to internal Storage lifecycle fields, and the public API/export previously returned those fields. PR #387 exact head `a23e7565695e119a329d67234681fa74fa41d9c2` passed Quality Gate, Android Debug and CircleCI; its column-grant/DTO/export fix remains unmerged.
- Stories RLS remains broader than the app's approved/global contract. A read-only query found 21 published rows, all currently approved and global (zero affected rows today), but the live public policy checks only `published=true`. PR #386 and its stacked fallback repair PR #390 remain open; no production rows were changed.
- The live scheduler secret row has length 32 and does not match the 64-hex hardening contract; the secret value was not retrieved. The active pg_cron dispatcher targets the canonical project and reads the secret dynamically. PR #392 exact head `92964e296997b41de8e5bb0f2bef05cb7daba44e` contains the corrected comment-insensitive test; Android Debug and CircleCI passed, Quality Gate remains in progress. No production migration was applied.
- Vercel's latest production deployment `dpl_7btEkudu5wcxhicM6uRoCkWfJtyr` is READY on `00fc4ff6dba9f76a9d59cae28c2270a58cac77d9`, four commits behind current main `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`. No new deployment or production smoke test was run.
- Owner acceptance remains blocked: CODEOWNERS assigns `@Zikrmediaofficial`, but the connected GitHub identity has no collaborator permission for that owner and the relevant PR review lists are empty. No branch, review or approval gate was bypassed. No production mutation, Edge Function/Cron invocation, content generation, Gemini request, social publishing, Storage operation or release was performed.


## Review batch — 2026-11-17 (Kids share counter and shared rate-limit contract)

- Read the complete `20260814120000_0033_atomic_kids_share_counter.sql` and `20260814121000_0034_lock_down_kids_share_rpc.sql` migrations. Traced `increment_kids_content_shares` through the Kids share API route, the server-only rate-limit helper, the KidsShare client component and the shared rate-limit RPC. The later applied `20261110212000_kids_content_public_read_respects_active_state.sql` replaces the original function with SECURITY INVOKER, an empty search_path, published/active/age-approved story predicates and service_role-only EXECUTE. The two original migration rows are marked REVIEWED_SOURCE_ONLY; no production call was made.
- Reviewed `20261008082029_20261008110000_restore_admin_rate_limit_contract.sql` and its current server consumers. Found a reproducible SQL NULL-validation defect: NULL `p_limit` passes the existing less-than check, consumes a counter row and returns NULL; NULL `p_window_seconds` reaches a NOT NULL insert failure. The RPC is service-role-only, but invalid arguments should return FALSE before any mutation.
- PR #396 exact head `a8aa7b151ab5156a441633792cc1b23802032152` adds explicit NULL checks, pins the SECURITY DEFINER function to an empty search_path, and adds PostgreSQL 17 integration coverage for NULL/blank/zero arguments, no-mutation behavior, valid atomic limits and role grants. GitHub Quality Gate is queued; CircleCI config-guard/source-verify/application-build-docs are pending; Supabase Preview is skipped. The migration has not been applied.
- Current row totals: 1959 file rows; 1178 UNREVIEWED (361 high priority); 781 non-UNREVIEWED. Main snapshot and immutable manifest remain unchanged. PR-only files are not added to the main manifest or matrix before merge.
- No production SQL/DDL/DML, migration apply, rate-limit RPC invocation, content generation, Gemini request, social publishing, Storage/media mutation, release, merge or deployment was performed.


## Review batch — 2026-11-17 (Auth/OAuth, native mobile, Quran audio and Supabase advisors)

- Read the actual auth actions, Google OAuth initiation, callback, safe next-path/origin helpers, request proxy, Supabase middleware, authenticated profile-sync route/service, native callback handler, Capacitor bridge, Android manifest/MainActivity, iOS Info.plist/entitlements/Podfile/Xcode project and Android release URL/metadata/download paths. Browser/native OAuth uses PKCE, canonical origins and same-origin next-path validation; native callback accepts the fixed app scheme or canonical HTTPS bridge. Device, Apple signing and provider-console acceptance remain open.
- Read offline Quran audio, its URL/path policy and regression tests. The historical storage migration hardcodes the retired `nmdeazfmtncelykzxkhs.supabase.co` project host. Read-only queries against active project `zqtssvlvmkzeeyqghqfk` found 19,608 `quran_audio` rows, all `external`, 0 `storage_url` values, 0 ready rows and 0 `quran-audio` Storage objects. The server rejects a non-current storage host and falls back to the validated external `audio_url`; no current production row is affected. No historical migration was edited and no data or object was changed.
- The native bridge exposed a public `writeFile(path, data)` facade without the path allowlist used by download/delete/getFileUrl. No in-repository caller was found. PR #397 exact head `e299be7a72a60396c6653cdddbdfc79e9c870b13` adds the same Quran-audio path guard and a regression assertion; exact-head Quality Gate and Android Debug are in progress.
- Supabase Performance Advisor flagged `site_audio_upload_intents.asset_id` as an unindexed FK. Read-only query confirmed the table has 0 rows and no valid index on `asset_id`. PR #398 exact head `2070312056a49061b1df62d98aa0c99c7da6f5ad` adds a forward-only btree index and a PostgreSQL 17 integration assertion; exact-head Quality Gate is in progress. No production DDL/index creation was performed.
- PR #395 exact head `d0776622580bfb218b99099807a263c3ebf7b536` contains profile timestamp trigger hardening, a corrected own-profile RLS fixture, the client payload type fix and the migration replay fixture column. Its exact-head Quality Gate remains in progress; previous failed heads were investigated and corrected, not counted as passes.
- Live Supabase security/performance review: service-only tables `push_subscriptions`, `site_audio_assets`, `site_audio_upload_intents`, `social_publish_queue` and `video_generation_requests` have no anon/authenticated table grants; their no-policy RLS state is consistent with service-role-only access. `prophet_sections` has two permissive SELECT policies for authenticated users (public read plus admin read), a performance warning retained for owner review. The advisor reports 77 unused indexes; none were dropped. Leaked-password protection is disabled in Auth settings and requires an owner/dashboard action.
- Production `consume_admin_rate_limit` still has the NULL-argument validation gap and `search_path=public`; PR #396 exact head `a8aa7b151ab5156a441633792cc1b23802032152` passed full-scope Quality Gate and all three CircleCI contexts, but is draft/unmerged and its migration is not applied.
- PR #394 exact head `4a7f546c714315d75c1a926302294b96d2e0afce` passed Quality Gate and all three CircleCI contexts. PR #344 documentation branch exact head `31a869334e555947b87ef02ef5b09be6746af7d5` passed Quality Gate, CircleCI and Android Debug APK checks. PR #395/#397/#398 remain pending exact-head verification. Shared workflow and migration-replay files touched by multiple open PRs require combined mainline verification after rebase/merge.
- No production SQL/DDL/DML, migration apply, index creation/deletion, Auth setting change, content generation, Gemini request, social publish, Storage/media mutation, Android/iOS release, merge, Vercel deployment or production smoke test was performed.


## Review batch — 2026-11-17T06:02:00.000Z (native loader and site-audio test fixture)

- Read `src/components/layout/native-capacitor-bridge-loader.tsx` and its `src/app/layout.tsx` consumer. The loader mounts both native modules through `next/dynamic` with SSR disabled; the Google OAuth handler remains the sole PKCE callback owner. No loader defect was reproduced.
- Read `scripts/tests/site-audio-upload-intents.integration-setup.sql` and traced its only shell-runner consumer. It creates roles and a stub asset table only inside the disposable PostgreSQL 17 integration container; no production object is addressed.
- PR #395 exact head `d0776622580bfb218b99099807a263c3ebf7b536` passed Quality Gate `44024606420` and all three CircleCI contexts. PR #397 exact head `e299be7a72a60396c6653cdddbdfc79e9c870b13` passed Quality Gate `44024658079`, Android Debug APK `44024658056`, and all three CircleCI contexts. Both remain open/draft pending owner review.
- PR #398 exact head `fa99af59041ebfda2eb5976a0928c0dee841c7e2` restores the integration runner's `100755` executable mode after the prior diff accidentally changed it to `100644`; a runtime mode assertion now guards that contract. Its SQL test also requires a valid, ready, full non-partial single-key btree on `asset_id`. PostgreSQL 17 integration passed in Quality Gate run `44028580036`; the canonical source gate and CircleCI source/application contexts were still pending at this checkpoint. No production index was created.
