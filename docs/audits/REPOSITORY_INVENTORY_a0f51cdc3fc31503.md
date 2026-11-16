# Repository inventory — main snapshot a0f51cdc3fc31503f12ddddba76e37d9e07a15f7

Generated: 2026-11-16T13:04:59.302Z
Updated: 2026-11-16T22:42:30.906Z (reconciled with PR #381 narration provenance/SSRF repair and current exact-head CI state)

## Exact snapshot

- Repository: `zikrofficial-X/Zikr`
- Main commit: `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`
- Git tree SHA: `7a73fa9af3ae0de67275dd33c4a1f8f18038d909`
- Recursive tree entries: **2459**
- Tracked blobs/files: **1959**
- Directories: **500**
- Tree truncated: **no**
- Full manifest: [`docs/audits/REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl`](./REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl) — blob SHA `baace6d0c66ac299edb541c7caceba56eeae19be`
- Full file-status matrix: [`docs/audits/REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl`](./REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl) — current blob SHA `64f927182496506735cfc6763b4356bb91f3de2f`

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

- `DOCS_RECONCILIATION_PENDING`: 4
- `FIX_PENDING_PR337`: 5
- `FIX_PENDING_PR338`: 3
- `FIX_PENDING_PR339`: 2
- `FIX_PENDING_PR340`: 3
- `FIX_PENDING_PR341`: 1
- `FIX_PENDING_PR343`: 2
- `FIX_PENDING_PR343_PR376_PR377_PR378_PR379_PR380_PR381`: 1
- `FIX_PENDING_PR346`: 1
- `FIX_PENDING_PR347`: 2
- `FIX_PENDING_PR349`: 5
- `FIX_PENDING_PR350`: 2
- `FIX_PENDING_PR351`: 2
- `FIX_PENDING_PR352`: 3
- `FIX_PENDING_PR353`: 4
- `FIX_PENDING_PR358`: 2
- `FIX_PENDING_PR362`: 3
- `FIX_PENDING_PR369`: 1
- `FIX_PENDING_PR370`: 4
- `FIX_PENDING_PR372`: 1
- `FIX_PENDING_PR373`: 4
- `FIX_PENDING_PR374`: 1
- `FIX_PENDING_PR375`: 2
- `FIX_PENDING_PR376`: 2
- `FIX_PENDING_PR377`: 1
- `FIX_PENDING_PR378`: 3
- `FIX_PENDING_PR379`: 4
- `FIX_PENDING_PR380`: 2
- `FIX_PENDING_PR381`: 8
- `FIX_PENDING_PR381_PARTIAL_REVIEW`: 2
- `HISTORICAL_PR320_OVERLAY`: 1
- `HISTORICAL_STALE_MANIFEST`: 1
- `OWNER_CONFIG_REQUIRED_PR343`: 1
- `OWNER_SETTING_REQUIRED`: 1
- `REVIEWED_DATA_GENERAL_EDITORIAL`: 1
- `REVIEWED_DATA_VALIDATED`: 45
- `REVIEWED_PARTIAL`: 66
- `REVIEWED_PERMISSION_SCAN`: 86
- `REVIEWED_PRODUCTION_APPLIED`: 47
- `REVIEWED_PRODUCTION_SMOKE_200`: 4
- `REVIEWED_REGRESSION_COVERAGE`: 72
- `REVIEWED_SOURCE_ONLY`: 302
- `SECURITY_FIX_PENDING_PR340`: 4
- `UNREVIEWED`: 1248

High-priority unreviewed files: **414**. The matrix has 1959 file rows; 711 are not marked `UNREVIEWED`.

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
