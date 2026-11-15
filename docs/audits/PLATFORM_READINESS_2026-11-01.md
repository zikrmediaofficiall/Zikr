# ZIKR External Platform Readiness — 2026-11-01

## Final audited baseline
- Repository: `zikrofficial-X/Zikr`
- Code release commit deployed to production: `18349e48fa601ffe16d13014549f03ca5186a07d`
- Vercel project: `zikr`, team `zikr3`, linked Git repository `zikrofficial-X/Zikr`
- Supabase project: `ymxdswkaxafakugktsim`
- Follow-up owner controls: [GitHub issue #170](https://github.com/zikrofficial-X/Zikr/issues/170)

## GitHub
- Default branch is `main`; only `main` exists in the branch listing after the completed merges.
- `main.protected=false` and repository rulesets are empty. The connected GitHub integration cannot read the branch-protection endpoint (HTTP 403) and exposes no write action for branch protection/rulesets.
- On the deployed code commit, ZIKR Quality Gate and CircleCI `config-guard` and `application-build-docs` all completed successfully.
- PRs #162, #165, #167, #168 and #169 are merged.
- Owner action: enable Branch Protection or Rulesets for `main`; require pull requests; require the ZIKR Quality Gate, CircleCI config guard and application-build-docs checks; block force pushes and deletion; dismiss stale approvals.
- This cannot safely be claimed complete until it is enabled and re-read in GitHub settings.

## Vercel
- Project uses Next.js and Node 22.x.
- Production deployment `dpl_7b2zkK2cD7zZe9Rwx4wattmSyJQX` is `READY`, target `production`, built from `main` at `18349e48fa601ffe16d13014549f03ca5186a07d`.
- Production aliases: `zikrmediaofficial.vercel.app`, `zikr-zikr3.vercel.app`, and `zikr-git-main-zikr3.vercel.app`.
- `zikrmediaofficial.vercel.app` is verified and attached to the production deployment.
- Vercel Git auto-deploy is disabled; the above deployment was explicitly created from the linked Git repository and exact commit after the main Quality Gate passed.
- `POSTGRES_URL` was changed to the Vercel `sensitive` variable type without retrieving or changing its value. Follow-up metadata confirmed `visibility=secret` and no remaining security issues for this variable.
- Two preview-only `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` entries remain scoped to branch names no longer present: `fix/google-native-login-canonical` and `branding/zikr-identity`. The available Vercel connection exposes list/create/edit but no delete-project-environment-variable action. Do not repurpose them. Owner should remove those two Preview-only entries after confirming no external preview process depends on them; keep the generic Preview and Production entries.
- Preview deployment protection was not weakened.

## Production smoke tests
All checks below were performed against the public production alias after deployment `dpl_7b2zkK2cD7zZe9Rwx4wattmSyJQX` reached READY:
- Home page: HTTP 200.
- Valid video `/videos/story-of-musa-full`: HTTP 200, expected YouTube embed ID present, metadata remains noindex.
- Valid dua `/dua/zikr-dua-quran-002250`: HTTP 200 and the expected published Arabic dua text is present.
- Missing video `/videos/non-existent-zikr-smoke-check`: HTTP 200, localized unavailable-content state rendered, `noindex, nofollow`.
- Missing dua `/dua/non-existent-zikr-smoke-check`: HTTP 200, localized unavailable-content state rendered, `noindex, nofollow`.
- None of these returned HTML contained the React streaming-boundary error. The missing-resource pages intentionally render an inline unavailable state rather than throwing a late streamed `notFound()`; consequently they return HTTP 200 with noindex instead of an HTTP 404.
- Vercel Runtime Errors for the 10-minute period after smoke checks reported no runtime errors. Deployment-specific error/fatal runtime logs for that same period were empty.

## Supabase
- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.11.
- Production exposes 86 public tables; all 86 have RLS enabled.
- Repository and production migration ledgers both contain 391 versions; there is no local-only or production-only migration version.
- Production Health passed public Auth/content checks and confirmed anonymous access to `content_translation_queue` is denied with HTTP 401. No extra anon grants were introduced.
- Security advisor:
  - `youtube_sync_state` has RLS enabled and no policies. This is intended default-deny protection for a private sync-state table; do not add an anonymous policy.
  - Leaked-password protection is disabled. The connected Supabase tools expose no Auth password-security setting update. Owner action: Supabase Dashboard → Authentication → Settings → Password Security; enable compromised-password checks, then rerun Security Advisor.
- Performance advisor reported 64 indexes with no observed usage in its snapshot. These are review candidates only, not approved deletion candidates. Capture usage across a representative business cycle and check query plans, PK/unique constraints and FK support before proposing any individual index drop.
- No production table, row, policy, schema, migration, index or storage object was destructively changed as part of this closeout.

## Remaining owner / human acceptance
- GitHub branch protection and required checks.
- Remove the two stale Preview-only Vercel environment-variable records after dependency confirmation.
- Enable Supabase leaked-password protection and re-run advisor.
- Physical Android/iOS device and full interactive browser acceptance; CI mobile-readiness passed but a real device test was not available through these connections.
- Qualified human religious/editorial review of Quran text, hadith grading and rulings. Automation must not self-approve religious sources.
- Google Search Console ownership, AdSense publisher account approval, live ad serving and CMP/account status remain unverified because they require the owner’s Google account.
- Review the 64 advisor-flagged indexes before any removal; no indexes were dropped.

## Safety decisions
- No applied migration was deleted, renamed, reordered or rewritten.
- No compatibility route redirect was deleted.
- Active Admin Video Studio and Video Requests clients were moved to feature-owned modules; canonical route imports were updated.
- No production deployment protection was removed.


## 2026-11-15 current readiness checkpoint

- PR #320 is open against `main@c4560d9ccb222bea5814cc4db32d4c3f1a2101b3`, code/test checkpoint `0b5b6a3a7ed47e3a1b8d7fcc9719015747ba6a5b`; 616 changed paths (96,040 additions, 6,562 deletions, zero deleted paths).
- Canonical Quality Gate run `43753246088` passed with `QUALITY_GATE=PASSED_FULL`; CircleCI Config Validation `43753246084` passed; Android Native Login Debug APK `43753246093` passed.
- File-status overlay: 614 rows; CONTENT_READ_TESTED_PASS=390, FIXED_TESTED_PENDING_LIVE_APPLY=36, REVIEW_REQUIRED=182, SUPERSEDED_SNAPSHOT=6. The 182 review-required rows remain open.
- Repository tree: 2,442 entries (1,943 blobs, 499 directories); manifest target 2,439 entries, excluding the `docs/` and `docs/audits/` ancestor tree hashes and its own blob.
- Supabase: 445 local SQL migrations, 418 applied, 27 unapplied; no production migration was applied.
- Vercel latest production deployment `dpl_4d8m4a1W4iL7fZrVvP5zq6s2cN9h` is READY at `main@c4560d9`; this audit branch has not been deployed.
- CODEOWNERS is `@Zikrmediaofficial`; no owner review is recorded and the attempted reviewer request did not register. Merge/deploy remain blocked.
- No audit-dispatched content generation, Gemini calls, social publishing, production DB mutation, storage/media deletion, release or deployment occurred. Existing scheduled workflows were inspected only.

### Open release/owner gates
- PR #320 is mergeable at the Git level but has no CODEOWNERS approval; the owner review request did not register. Do not merge or bypass branch protection.
- 27 Supabase migrations remain unapplied. The new atomic Kids video approval RPC migration is not live; production video-approval routes must not be treated as deployed.
- Main's public offline Kids snapshot exposes 20 unapproved stories. The safe filtered snapshot and verifier are in PR #320, not main.
- Main's scheduled social publisher has no Kids human-review gate. The branch adds it; owner must review before merge.
- The offline refresh workflow's PR-creation failure now fails visibly in the branch; repository Actions PR-creation permission or a write-scoped token remains an owner-only configuration step.
- Vercel production remains on `main@c4560d9`; no deployment of the audit branch was made. Missing iOS AASA app ID and GA4 service credentials remain owner inputs.
- Manual acceptance remains: iOS universal links/OAuth/push/audio/offline behavior on a physical device; Android signed release/Play Store install; provider account permissions and production smoke after an approved deployment.