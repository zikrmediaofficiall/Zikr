# Repository inventory — main snapshot a0f51cdc3fc31503f12ddddba76e37d9e07a15f7

Generated: 2026-11-16T13:04:59.302Z
Updated: 2026-11-16T17:44:00Z

## Exact snapshot

- Repository: `zikrofficial-X/Zikr`
- Main commit: `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`
- Git tree SHA: `7a73fa9af3ae0de67275dd33c4a1f8f18038d909`
- Recursive tree entries: **2459**
- Tracked blobs/files: **1959**
- Directories: **500**
- Tree truncated: **no**
- Full manifest: [`docs/audits/REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl`](./REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl) — blob SHA `baace6d0c66ac299edb541c7caceba56eeae19be`
- Full file-status matrix: [`docs/audits/REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl`](./REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl) — current blob SHA `748d141081ffccca0499d00f7f94a5bf632206a2`

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

- `DOCS_RECONCILIATION_PENDING`: 2
- `FIX_PENDING_PR337`: 9
- `FIX_PENDING_PR338`: 4
- `FIX_PENDING_PR339`: 5
- `FIX_PENDING_PR340`: 3
- `FIX_PENDING_PR341`: 2
- `FIX_PENDING_PR343`: 4
- `FIX_PENDING_PR346`: 2
- `FIX_PENDING_PR347`: 2
- `FIX_PENDING_PR349`: 5
- `FIX_PENDING_PR350`: 3
- `FIX_PENDING_PR351`: 2
- `FIX_PENDING_PR352`: 3
- `FIX_PENDING_PR353`: 4
- `HISTORICAL_PR320_OVERLAY`: 1
- `HISTORICAL_STALE_MANIFEST`: 1
- `OWNER_CONFIG_REQUIRED_PR343`: 1
- `OWNER_SETTING_REQUIRED`: 1
- `REVIEWED_DATA_GENERAL_EDITORIAL`: 1
- `REVIEWED_DATA_VALIDATED`: 16
- `REVIEWED_PARTIAL`: 43
- `REVIEWED_PERMISSION_SCAN`: 92
- `REVIEWED_PRODUCTION_APPLIED`: 32
- `REVIEWED_PRODUCTION_SMOKE_200`: 4
- `REVIEWED_REGRESSION_COVERAGE`: 26
- `REVIEWED_SOURCE_ONLY`: 187
- `SECURITY_FIX_PENDING_PR340`: 5
- `UNREVIEWED`: 1495

High-priority unreviewed files: **563**.

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

## Reconciled audit batch — 2026-11-16 17:44 UTC

- Repository snapshot remains main a0f51cdc3fc31503f12ddddba76e37d9e07a15f7; this audit branch changes only audit documentation.
- Authoritative matrix blob: 748d141081ffccca0499d00f7f94a5bf632206a2. Current inventory: 1,959 tracked blobs, 1,495 still unreviewed (563 high priority), 464 reviewed; the matrix is the per-file source of truth.
- Main is five commits ahead of historical verification/deployment source 26ae58fdd2220897511544e9475eab28979f88f5. Full Quality Gate passed on PR #350/#351 heads based on main a0f51; CircleCI contexts on main pass. The production deployment last recorded READY is still associated with 26ae; not rechecked this run. vercel.json has Git deployment disabled, so deployment requires an authorized manual action after owner review.
- Read-only Supabase verification of configured project zqtssvlvmkzeeyqghqfk (Zikrofficial): ACTIVE_HEALTHY, 449 applied migrations through 20261116045100, 103 tables including storage, zero RLS-disabled tables, nine buckets. Current Kids/video policies match the reviewed migrations. No migration, DDL, DML, function deployment or storage mutation was performed.
- Current production automation: written-content generation is scheduled 15 7,13,19 UTC and uses Gemini; AI video generation is scheduled 17 3,9,15,21 UTC in free-only mode; social publishing is scheduled 7,22,37,52 UTC each hour and can publish public YouTube/Facebook when provider credentials and database settings permit. CircleCI English-content sync runs daily at 04:17 UTC and uses Gemini plus Supabase service-role writes. Prayer dispatch is every minute; source verification is daily. None of these workflows/functions was dispatched by this audit.
- Supabase YouTube/Facebook sync cron is inactive and its Edge Function is absent; GitHub Actions is the active social publisher. The legacy cleanup route has no caller/cron and the youtube-facebook-media bucket is absent. The separate audit-video-media workflow is a daily 04:41 UTC production metadata writer; main currently ignores YouTube deletion events and overwrites custom thumbnails, while PR #339 fixes this but remains unmerged. The storage-retention workflow runs daily 02:17 UTC in dry-run mode only; manual apply requires paused writers and typed confirmation, while PR #341 adds missing Quran/audio metadata references and bounded scans.
- Kids safety: public content requires published/active and age-appropriate story state; levels require a published parent; questions are admin-only; public videos require QA, human approval, a linked request and matching hashes. Written Kids social copy and Kids videos remain blocked until human approval. PR #337 makes catalog-only reconciliation independent of provider gates but remains unmerged; main currently does not call it, and SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED defaults to false. Owner must set the GitHub repository variable to true after merge.
- Storage: videos is a public 50 MiB bucket with zero objects at the snapshot; admin upload is step-up/audit protected but has no private staging/expiry, so draft uploads are publicly readable before form save. This is a design risk, not a current exposed object. public-assets is public/empty/no current app consumer; site-audio is public with six objects and no client write policy. No objects were deleted or created.
- Supabase advisor: leaked-password protection remains disabled (owner setting); five RLS-enabled tables intentionally have no client policies (service-role-only); 79 unused-index notices were left untouched; one unindexed FK (site_audio_upload_intents.asset_id) and one multiple-permissive-policy notice (prophet_sections) remain.
- Open repair PRs: #337 (Kids catalog/provider-gate separation; full Quality Gate + CircleCI pass), #339 (daily production video-media audit tombstone/custom-thumbnail fix; full pass), #340 (Kids category restrictive video RLS; full Quality Gate 43868893060, CircleCI and PostgreSQL 17 integration; migration PR-only), #341 (storage-retention Quran/audio reference and pagination safety; full pass), #343 (iOS App ID guard; full pass and Android debug APK, owner App ID required), #347 (path-aware release checks and guarded manual Android tag retry; full Quality Gate 43886674997 and CircleCI pass), #349 (prayer timezone migration; full pass), #350 (native splash; full pass and Android debug APK), #351 (signing-path ignore; full pass), #352 (favorite UUID validation; full pass), #353 (legacy Kids result idempotency; full Quality Gate 43920546145 and CircleCI pass; migration remains PR-only). All remain unmerged pending authorized CODEOWNERS review. PR #344 remains the audit-documentation PR.
- No production publishing, content generation, Gemini request, Android release, migration, function deployment, Vercel deployment, smoke test or storage deletion was triggered.

- Android release guard note: current main recovery dispatcher can target a tag, but the publisher rejects workflow_dispatch on tag refs, so tag-based recovery is fail-closed but incomplete; no current bypass was reproduced. PR #347 adds an explicit retry=true tag path with retry flag, canonical notes, exact tag SHA, existing draft/non-prerelease release, signed android-rebuild and CODEOWNER preflight. No release was triggered.

- Storage cleanup boundary: the 02:17 UTC scheduled storage-retention run is dry-run only. Destructive apply is manual-only and requires apply=true, reference_writes_paused=true, typed DELETE_STAGING_COPIES_AFTER_REFERENCE_FREEZE, canonical project ref and safe retention RPC; site-audio cleanup has no workflow caller and requires its own explicit pause/confirmation. No cleanup apply was run.

- Kids public display trace: /kids consumes /api/kids/content, /api/kids/videos and /api/kids/social-posts. Content is published/active with age-appropriate visibility and guarded fallback; videos require QA pass, human approval, linked request and matching hashes; written posts require a published/active age-appropriate source plus published/partial queue state and platform visibility checks. Video feed/detail derive social state from the live queue, not only metadata; the earlier detail-page metadata inconsistency is no longer current. The optional PR #337 catalog mirror is not required for the public feed.
- Kids video RLS hardening: live public.videos RLS currently has a permissive metadata-based policy but no restrictive category_id guard. The canonical kids-stories category has 34 published rows and all currently have audience='kids'; no misclassified published row was observed. PR #340 adds the category-level restrictive guard and passed local PostgreSQL 17 integration; migration remains unapplied.
