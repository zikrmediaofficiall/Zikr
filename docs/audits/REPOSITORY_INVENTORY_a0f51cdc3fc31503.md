# Repository inventory — main snapshot a0f51cdc3fc31503f12ddddba76e37d9e07a15f7

Generated: 2026-11-16T13:04:59.302Z

## Exact snapshot

- Repository: `zikrofficial-X/Zikr`
- Main commit: `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7`
- Git tree SHA: `7a73fa9af3ae0de67275dd33c4a1f8f18038d909`
- Recursive tree entries: **2459**
- Tracked blobs/files: **1959**
- Directories: **500**
- Tree truncated: **no**
- Full manifest: [`docs/audits/REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl`](./REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl) — blob SHA `baace6d0c66ac299edb541c7caceba56eeae19be`
- Full file-status matrix: [`docs/audits/REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl`](./REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl) — blob SHA `80cf4b3c4c5085e5b6902984a68ac40f3bb4051f`

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

- `UNREVIEWED`: 1894
- `REVIEWED_SOURCE_ONLY`: 24
- `FIX_PENDING_PR337`: 9
- `FIX_PENDING_PR343`: 5
- `FIX_PENDING_PR339`: 5
- `FIX_PENDING_PR338`: 4
- `FIX_PENDING_PR340`: 3
- `SECURITY_FIX_PENDING_PR340`: 3
- `DOCS_RECONCILIATION_PENDING`: 2
- `FIX_PENDING_PR341`: 2
- `REVIEWED_PARTIAL`: 2
- `OWNER_SETTING_REQUIRED`: 1
- `HISTORICAL_PR320_OVERLAY`: 1
- `HISTORICAL_STALE_MANIFEST`: 1
- `SNAPSHOT_REVIEW_PENDING_PR342`: 1
- `OWNER_CONFIG_REQUIRED_PR343`: 1
- `REVIEWED_PRODUCTION_SMOKE_200`: 1

High-priority unreviewed files: **748**.

## Verified repository and production state

- Main Quality Gate: passed on `a0f51cdc3fc31503f12ddddba76e37d9e07a15f7` (run `43833156580`).
- Main CircleCI: `config-guard` passed; `source-verify` and `application-build-docs` were still pending at snapshot time.
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
| 339 | YouTube fallback publication state typing | `49061f73ef33a7a9cea758e3c36c8ac7f88dfddb` | Quality Gate + CircleCI passed |
| 340 | Kids category-level public video RLS guard | `86b166410669b47f2984854fc3c4f364f8370c9b` | PostgreSQL 17 integration, Quality Gate + CircleCI passed |
| 341 | Complete bounded Quran-audio reference pagination for storage audit | `f1fa0e5c7c6959bfd2d0b6552c808efb72c0ee80` | Quality Gate + CircleCI passed |
| 342 | Validated offline-content snapshot manifest | `e38c9d69cb7d9ef0aac2f1992d10b96538533563` | Quality Gate + CircleCI passed |
| 343 | Production Apple Universal Links configuration guard | `68edfb6aeccd57981f0fb811443da7960e1996c8` | Quality Gate run 43871761649, Android Debug APK run 43871760192, and all CircleCI checks passed |

All PRs remain unmerged. PR342 is a content-manifest snapshot, not a production database mutation.

## Background workflow findings

- Offline-content refresh run `43845944941` validated 25 datasets and pushed a branch, but the workflow token could not create its PR. PR342 was opened manually and marked ready for review after green checks. The owner must enable GitHub Actions PR creation or provide a least-privilege `GH_TOKEN` with `pull-requests:write`.
- Storage-retention run `43843404168` failed closed at the 5,000-row cap for `quran_audio.metadata`. No storage deletion occurred; owner confirmation was skipped. PR341 raises only this known inventory cap to 25,000 and retains fail-closed behavior above it.
- No content generation, Gemini call, social publication, production migration, production DB mutation, Storage deletion, Android release, or Vercel deployment was triggered by this audit.

## Owner/device acceptance still required

- `.github/CODEOWNERS` names `@Zikrmediaofficial`, but that account has no repository collaborator permission. The authenticated `zikrofficial-X` account is the PR author and cannot approve its own PR. Independent owner review is blocked until an authorized reviewer is added or CODEOWNERS is corrected.
- Branch-protection details could not be read through the connected GitHub API; do not merge until an authorized owner confirms required rules and approvals.
- The real Apple Team ID is absent from the repository. An owner must set Vercel Production `IOS_ASSOCIATED_DOMAIN_APP_ID=<TEAM_ID>.com.zikr.app`, redeploy, and verify AASA HTTP 200.
- Physical Android/iOS device acceptance, store-signed certificate comparison, iOS archive/signing, and native push/deep-link acceptance remain manual. No release was created.
- Repository-wide file review is **not complete**. The matrix marks all remaining files `UNREVIEWED`; continue in priority order and update the matrix only with actual content and evidence.

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
