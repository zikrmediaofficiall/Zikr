# ZIKR — CircleCI and Supabase environment matrix

**Last updated:** 2026-11-15

This document covers the current CircleCI CI/release lanes and the Supabase Edge Function runtime. GitHub Actions is the production owner for video/social scheduling. CircleCI does not execute the production video/social worker.

## CircleCI

### Application build/documentation

The `application-build-docs` job requires the public build-time Supabase URL/key and canonical production origin, then runs:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm ci:build:report
```

### Android release

`android-rebuild` pins these non-secret build settings in `.circleci/config.yml`:

- `NEXT_PUBLIC_SUPABASE_URL=https://zqtssvlvmkzeeyqghqfk.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon key; it is not a service-role secret)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are deliberately overridden with empty job-level values; the Android build does not use the service-role credential.

The following values must be available before the Android job starts:

- `ANDROID_KEYSTORE_BASE64` — CircleCI context `android-signing`
- `ANDROID_KEYSTORE_PASSWORD` — CircleCI context `android-signing`
- `ANDROID_KEY_ALIAS` — CircleCI context `android-signing`
- `ANDROID_KEY_PASSWORD` — CircleCI context `android-signing`
- `GH_TOKEN` — CircleCI context `android-signing` (fine-grained token for the guarded GitHub Actions dispatch)

The `android-rebuild` workflow attaches the `android-signing` context and consumes the four protected keystore variables plus `GH_TOKEN` for the guarded recovery dispatch. The follow-up `android-release-dispatch` job attaches the same context only to obtain `GH_TOKEN`; it shadows the four keystore variables with empty job-level values. The context must exist in the CircleCI organization and be authorized for this project before the release workflow is run. Keep signing material, service-role credentials, and the GitHub token out of the repository.

The Android jobs fail early and list missing variable names without printing their values. `GH_TOKEN` must be a protected fine-grained GitHub token scoped to this repository with **Actions: Read and write** permission. The dispatched GitHub Actions workflow uses its own restricted `GITHUB_TOKEN` (`actions: write`, `contents: read`, `statuses: read`) to inspect the exact source commit and dispatch the guarded publisher. Do not move the signing material, service-role key, or GitHub token into the repository or a public workflow file.

The Android release lane uses one semantic tag (`vX.Y.Z`). There is no `-build` parallel tag.

### English content synchronization

CircleCI owns the recurring English article/Hadith synchronization schedule. GitHub keeps a manual fallback workflow only.

The scheduled `english-content-sync` job does not attach the `android-signing` context. It requires these CircleCI **project environment variables**:

- `SUPABASE_URL=https://zqtssvlvmkzeeyqghqfk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

The job validates all three names and verifies that `SUPABASE_URL` is exactly the canonical HTTPS project origin before running `pnpm translate:articles:en` and `pnpm sync:hadith:en`. Both worker scripts repeat this project guard before any queue recovery, API request, or database write. Missing variables or a mismatched URL cause an early failure; valid credentials can still fail later due to provider/API or content-sync errors.

The current production baseline commit `c4560d9ccb222bea5814cc4db32d4c3f1a2101b3` has these observed status contexts: CircleCI `application-build-docs` **success**, CircleCI `source-verify` **success**, CircleCI `android-release-draft` **success**, CircleCI `config-guard` **success**, Vercel **success**, and CircleCI `english-content-sync` **failure**. The scheduled sync is a separate daily pipeline and is not represented by the current PR check set. The failed context links to CircleCI workflow `0cb3da40-1fef-496f-8a12-a124ff9d25d4` / job `b43d282f-4bf9-46db-b02a-8beffb663df2`; its authenticated logs are not accessible through the connected read-only interface, so the failure cause is **unverified**. Do not rerun this job as an audit test: it runs `pnpm translate:articles:en` and `pnpm sync:hadith:en`, which may invoke Gemini and write production Supabase. The owner must inspect the first failing step and scoped credentials before a deliberate rerun.

### Security and Supabase gates

CircleCI also runs the release-specific Supabase production gate and manual security audit. It does not execute `scripts/run-background-jobs.ts` for production video/social processing.

## GitHub Actions

Production video/social credentials and schedules live in protected GitHub environments:

- `generate-ai-video.yml` — recurring video generation.
- `publish-social.yml` — recurring social publishing.
- `release-finalization.yml` — controlled production web release and the source-controlled `prayer-notification-worker` Edge Function deployment after database migrations.

The controlled release requires the GitHub Actions **production environment** secret `SUPABASE_ACCESS_TOKEN` in addition to the administrative database URL. The workflow verifies that the token can list the canonical project before any production database mutation, applies and reconciles migrations, rechecks the exact approved `main` SHA, deploys the source-controlled `prayer-notification-worker`, `source-verified-content-agent`, `spiritual-ai`, and `health` Edge Functions, then rechecks `main` before the Vercel deployment. The worker's `verify_jwt = false` setting remains defined in `supabase/config.toml`; the worker performs its own database-backed scheduler-secret validation. Do not trigger this workflow until CODEOWNERS approval and owner release authorization are complete.

## Supabase Edge Functions

### `prayer-notification-worker`

Requires the canonical Supabase URL/service-role runtime. Its scheduler secret and VAPID configuration remain database-backed through protected RPCs.

### `source-verified-content-agent`

The function is currently fail-closed: AlQuran Cloud is catalog-only and no live source parser is implemented for the other configured parser keys. Its pg_cron schedule can record source skips, but this code does not fetch or enqueue source content. Treat source ingestion as not implemented until a parser and end-to-end verification are added.

### `spiritual-ai`

Request-driven authenticated function; it is not a scheduler.

### `health`

Request-driven health endpoint; it is not a scheduler.

The retired `sync-youtube-facebook` Edge Function is not part of the active runtime tree. The legacy pg_cron record remains disabled for migration/history compatibility only.

## Repository rules

Never place secret values in repository files. Keep service-role keys, OAuth refresh tokens, Page access tokens, Android signing material, and GitHub dispatch tokens in protected runtime secret stores.

## Android release recovery dispatch

The signed Android build is followed by a separate `android-release-dispatch` CircleCI job. The job uses the existing `android-signing` context and requires:

- `GH_TOKEN`: a fine-grained GitHub token scoped only to `zikrofficial-X/Zikr`, with **Actions: Read and write** permission. It is used only to dispatch `.github/workflows/dispatch-android-release-recovery.yml` on the exact release ref (the `android-release-vX.Y.Z` branch or the `vX.Y.Z` tag) after `android-rebuild` succeeds.
- Keep `GH_TOKEN` in the protected CircleCI context. Never add it to the repository, Vercel public variables, build args, or logs.
- If `GH_TOKEN` is absent, the dispatch job intentionally fails instead of silently claiming the Android release recovery was started.

After adding or rotating the token, verify the CircleCI `android-signing` context is available to the release pipeline before creating the next Android release.


## Secret-scoping checkpoint — 2026-11-14

The Supabase production verification job no longer inherits the `android-signing`
CircleCI context; its job definition requires `SUPABASE_SERVICE_ROLE_KEY` and
does not read Android keystore variables. Android signing remains attached to the
signed Android release jobs only.

**Owner action still required:** `SUPABASE_SERVICE_ROLE_KEY` (and the production
content-sync credentials) are currently documented as CircleCI project-level
environment variables. Project-level variables are available to every job in
the project, including jobs that do not need production database access. Move
these values into narrowly scoped CircleCI contexts, update the corresponding
job mappings, verify the affected jobs, and only then remove the old project-level
copies. This audit does not move or delete any secret because CircleCI context
administration is not available here.


## Production gate safety — 2026-11-14

The production Supabase health gate now performs read-only GET checks only.
The `consume_admin_rate_limit` RPC is state-mutating and is covered by local
PostgreSQL integration tests; it must not be invoked as a production smoke probe.


## CircleCI secret isolation — 2026-11-15

Job-level empty environment overrides now shadow project-level production values
in jobs that do not require them. This covers `config-guard`, `source-verify`,
`application-build-docs`, `security-audit`, and the read-only
`android-release-draft` verifier. The production Supabase gate receives only
its Supabase credentials; the scheduled English sync receives only its
Supabase/Gemini credentials; the Android dispatch job keeps its GitHub Actions
token but shadows Supabase, Gemini, and keystore values. Only the signed Android
rebuild consumes keystore values; the dispatch job still attaches the same
context for GH_TOKEN but overrides the four keystore values with empty strings.

CircleCI's documented precedence places job-level `environment` values above
context and project-level values, so these empty overrides prevent unrelated
jobs from inheriting project-level secrets. This is containment, not a
replacement for the owner action below: move `SUPABASE_SERVICE_ROLE_KEY` and
`GEMINI_API_KEY` from project settings into dedicated least-privilege
contexts for the production gate and scheduled English sync, move the Android
dispatch token into a GH-token-only context, verify the affected jobs, then
remove the project-level copies. The audit does not read, move, rotate, or
delete any secret.

The signed `android-rebuild` job retains the Android signing context and its
required GitHub dispatch token, but shadows the project-level
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` values at job scope. The
separate `android-release-dispatch` job retains the dispatch token while
shadowing Supabase, Gemini, and keystore values. The Android build receives
only the public Supabase URL/anon key needed by the client build, not the
production service-role credential.
