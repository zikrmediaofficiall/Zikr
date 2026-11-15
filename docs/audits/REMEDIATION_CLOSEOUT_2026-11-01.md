# ZIKR Remediation Closeout — 2026-11-01

## Scope and baseline
- Repository: `zikrofficial-X/Zikr`
- Initial audit base: `4547d87212f4ed65a41fd3c6cde579ef15460cf2`; final deployed code commit: `18349e48fa601ffe16d13014549f03ca5186a07d`
- Work included merged PRs #162, #165, #167, #168 and #169; final owner follow-ups are tracked in [issue #170](https://github.com/zikrofficial-X/Zikr/issues/170).
- This is a source-level audit. It does not assert live browser, Android, Supabase-account, Vercel-account or religious editorial acceptance.

## Implemented in this branch
1. Video detail route shares one request-scoped video lookup between metadata and page rendering and removes a full catalogue fetch from `generateStaticParams` on a force-dynamic, noindex route.
2. `PageSkeleton` becomes a server component, with a regression test for its server-only loading-fallback usage.
3. Both regression tests are registered in `pnpm test`.
4. CSP `frame-src` permits the Google Tag Manager noscript iframe.
5. AdSense source audit checks Kids subtree exclusion, custom-domain warning and explicitly distinguishes source checks from publisher approval.
6. Search Console source audit checks GTM CSP frame-src.
7. The repair branch passed full `pnpm verify` before merge; final `main` Quality Gate also passed on the deployed code commit.
8. Active Admin Video Studio and Video Requests clients were relocated into feature-owned modules by PR #168; compatibility route redirects were preserved.
9. Dynamic video and dua detail pages no longer throw late `notFound()` errors after asynchronous content reads; inline unavailable states are guarded by a regression test.

## Legacy and duplication decisions

### Retain compatibility routes
Admin video legacy route files are redirect aliases to canonical destinations; they are required for old bookmarks/deep links and the admin architecture tests. Do not delete them solely because they duplicate a route name.

### Active client UI is now feature-owned
- `src/features/admin/video-requests/components/admin-video-requests-client.tsx` is imported by canonical `/admin/video/requests`.
- `src/features/admin/video-studio/components/admin-video-studio-client.tsx` is imported by canonical `/admin/video/studio`.
- The old component files have been removed from `src/app/admin/videos` and `src/app/admin/ai-video`; compatibility page routes remain as redirects.

### Retain Supabase migration history
- `supabase/migrations`: 391 current migration files.
- `supabase/migrations_archive`: 35 archived historical files.
- Several migrations share identical blob contents under different timestamps/names. Preserve them; the applied ledger and duplicate-policy checks depend on immutable history. Never delete, rename, re-order or merge applied migration files as filesystem cleanup.
- `supabase/legacy_migrations` is historical compatibility material and requires production-ledger/dependency proof before retirement.

### Retain documentation archive
`docs/archive` is historical audit/release evidence. Refresh conflicting current information in active docs, rather than deleting archive history.

### Review-only, not proven duplicates
- `src/lib/i18n.ts` (client-safe types/helpers) and `src/lib/i18n/server.ts` (server-only cookie reader) serve different responsibilities.
- `src/lib/utils.ts` and `src/lib/utils/companions.ts` are not duplicate implementations; the latter re-exports feature-owned helpers.
- Admin verification scripts have overlapping scope but assert different architecture/security/governance contracts. Do not consolidate before checking all package scripts/CI callers.

## Not changed / owner or external validation required
- Branch protection was recorded as disabled in the comprehensive audit. Available GitHub actions here do not expose a branch-protection/ruleset write; enable required Quality Gate checks in repository settings.
- Vercel POSTGRES_URL was changed to the `sensitive` type without reading or altering its value. A production deployment was created for the exact approved main commit and the public alias now points to it.
- Two stale Preview-only Google OAuth client ID entries remain because the connected Vercel actions expose no delete-environment-variable operation; see issue #170.
- No production Supabase rows, schemas, migration ledger, grants, RLS, buckets or storage objects were deleted or modified by this branch.
- No database table or storage object cleanup without a recoverable export/backup plus FK, RPC, trigger and public URL reference tracing.
- Physical Android/iOS checks, full browser E2E and qualified religious/editorial review remain acceptance gates.
- AdSense approval and Search Console ownership cannot be verified from repository source alone.

## Verification
The PR Quality Gates passed before merge, the final main Quality Gate passed, and production deployment `dpl_7b2zkK2cD7zZe9Rwx4wattmSyJQX` reached READY. Live production smoke tests passed for home, valid and missing video/dua routes. The missing-route policy intentionally returns HTTP 200 with localized unavailable content and noindex metadata to avoid a late streamed 404 boundary. No new React streaming errors were found in the post-deploy runtime error window. This is not proof of Google account approval, physical device acceptance or human religious/editorial sign-off.


## 2026-11-15 continuation — not closed

- PR #320 is open against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`, code/test checkpoint `0b5b6a3a7ed47e3a1b8d7fcc9719015747ba6a5b`; 616 changed paths (96,040 additions, 6,562 deletions, zero deleted paths).
- Canonical Quality Gate run `43753246088` passed with `QUALITY_GATE=PASSED_FULL`; CircleCI Config Validation `43753246084` passed; Android Native Login Debug APK `43753246093` passed.
- File-status overlay: 614 rows; CONTENT_READ_TESTED_PASS=390, FIXED_TESTED_PENDING_LIVE_APPLY=36, REVIEW_REQUIRED=182, SUPERSEDED_SNAPSHOT=6. The 182 review-required rows remain open.
- Repository tree: 2,442 entries (1,943 blobs, 499 directories); manifest target 2,439 entries, excluding the `docs/` and `docs/audits/` ancestor tree hashes and its own blob.
- Supabase: 445 local SQL migrations, 418 applied, 27 unapplied; no production migration was applied.
- Vercel latest production deployment `dpl_4d8m4a1W4iL7fZrVvP5zq6s2cN9h` is READY at `main@c4560d9`; this audit branch has not been deployed.
- CODEOWNERS is `@Zikrmediaofficial`; no owner review is recorded and the attempted reviewer request did not register. Merge/deploy remain blocked.
- No audit-dispatched content generation, Gemini calls, social publishing, production DB mutation, storage/media deletion, release or deployment occurred. Existing scheduled workflows were inspected only.

The current branch has materially advanced the audit, but 182 paths remain REVIEW_REQUIRED and 36 fixes remain pending live application/owner rollout. Do not merge, deploy or claim closure until CODEOWNERS review, production migration review/application, offline snapshot refresh, scheduled publisher approval gating, the Kids catalog-sync retry gap, missing Vercel environment inputs and device acceptance are resolved.