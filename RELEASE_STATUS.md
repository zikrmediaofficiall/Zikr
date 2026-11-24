# ZIKR Project Release & Build Status

Last reconciled: 2026-11-24. Android v1.1.17 was verified against GitHub's immutable Release and signed tag; the production web deployment table below remains the historical 2026-11-16 baseline until the current controlled deployment completes.
Repository: https://github.com/zikrmediaofficiall/Zikr  
Production URL: https://zikrmediaofficial.vercel.app

## Production web deployment

| Item | Verified state |
|---|---|
| Deployed source commit | `26ae58fdd2220897511544e9475eab28979f88f5` |
| Current main commit | `26ae58fdd2220897511544e9475eab28979f88f5` |
| Vercel deployment | `dpl_F8opnXTMke2VhfRSrMUcoLmQUwQw` |
| Deployment state | READY (Production) |
| Production alias | `zikrmediaofficial.vercel.app` |
| Deployment URL | https://zikr-92iom525u-zikr3.vercel.app |
| Deployment created | 2026-11-16 (UTC) |
| Runtime verification | `/api/health` returns HTTP 200 and the exact deployed SHA; core page/API smoke checks return HTTP 200 |

The inspected production deployment is READY and serves `zikrmediaofficial.vercel.app` from the exact current `main` commit. `vercel.json` keeps Git deployments disabled, so future production web releases remain controlled/manual; this review did not trigger a redundant deployment.

## Atomic Android release preparation

The release manager reads all Android, package, footer, and iOS version files from one immutable main commit. It verifies their versions are aligned and fails closed when expected fields are missing, duplicated, or inconsistent.

It creates file blobs, assembles one Git tree, creates one child commit, and advances main once through a non-force fast-forward update. If main changes during preparation, the operation stops instead of overwriting a concurrent update. The semantic tag and Draft Release are bound to the exact created commit SHA.

Regression checks in scripts/verify-release-contract.mjs enforce the Git Data API flow, immutable source snapshot, single-parent commit, non-force ref update, exact tag provenance, absence of sequential Contents API writes, and version alignment across Android/iOS/footer/package.

Implementation commit: https://github.com/zikrmediaofficiall/Zikr/commit/3eeaa292716b09ec42119833659d6c1b7c7f53d3

## Release automation CI

The atomic release-manager fix commit passed:
- GitHub Actions — ZIKR / Quality Gate: SUCCESS.
- GitHub Actions — Supabase Preview: SUCCESS.
- CircleCI — application-build-docs on main: SUCCESS (build 2080).
- CircleCI — config-guard on main: SUCCESS (build 2081).

The v1.1.11 Android tag had one unrelated CircleCI application-build-docs failure (build 2071). Android's own source verification, Supabase production gate, signed build, and guarded publication all passed. The main web build/docs job passed independently; the tag-only web build result did not block or invalidate Android signing/publication.

Pipeline correction: CircleCI application-build-docs is main-only. Semantic Android tags continue to run source-verify, supabase-production-gate, android-rebuild, and the guarded Android release dispatch; they no longer trigger the separate web build/docs job. A regression assertion protects these filters.

## Latest published stable Android release

| Item | Verified state |
|---|---|
| Android version | 1.1.17 |
| Android versionCode | 71 |
| Application ID | `com.zikr.app` |
| Compile / Target SDK | 36 / 36 |
| Release tag | https://github.com/zikrmediaofficiall/Zikr/releases/tag/v1.1.17 |
| Tag target commit | `5b7eaed3a796afcab11aefdf978351f32a1b3dc1` |
| Annotated tag object | `4b3b6bad5ba6dff518f3366118175ff5ab802211` |
| Git tag signature | Annotated tag, **verified**; GitHub reason: `valid` |
| GitHub Release ID | `453887269` |
| Release state | Published, immutable |
| Published at | 2026-11-21 19:55:05 UTC |

### Published assets

| Asset | Size | SHA-256 |
|---|---:|---|
| app-release.apk | 30,148,012 bytes | `d8afec0db71b16f391abaafab2556fbb2c868f4bd4c7b7842206aa6033c73e88` |
| app-release.aab | 24,943,518 bytes | `20b6de5bbbb0ed1ff589e1e061dc0ccf3313a947c9d8dc6894789d6a74b9b36c` |
| release-metadata.json | 635 bytes | `f720810473e26ab592f659bb1cfcfcaf19db85d54445765ee83f093e7216eefd` |
| SHA256SUMS | 243 bytes | `4df006f172daf3151a4f3dff57ca19d7a81c3b7ba5f31df32252d86f05a7bb9c` |

Release: https://github.com/zikrmediaofficiall/Zikr/releases/tag/v1.1.17

Published downloads:
- [Signed APK](https://github.com/zikrmediaofficiall/Zikr/releases/download/v1.1.17/app-release.apk)
- [Signed AAB](https://github.com/zikrmediaofficiall/Zikr/releases/download/v1.1.17/app-release.aab)
- [SHA256SUMS](https://github.com/zikrmediaofficiall/Zikr/releases/download/v1.1.17/SHA256SUMS)
- [Release metadata](https://github.com/zikrmediaofficiall/Zikr/releases/download/v1.1.17/release-metadata.json)

GitHub API confirms that the release is published and immutable, all four assets are uploaded, and the annotated `v1.1.17` tag signature is cryptographically verified (`verified=true`, `reason=valid`). These observations concern the Android release only; they do not imply that the currently deployed website has been updated to this PR.

## Git tag signature and immutable release attestation

The published `v1.1.14` tag is an annotated Git tag object, but its Git object signature is **unsigned**. GitHub reports tag object `a1e3bb90093bd37d56d64f0b4e0c031b8cc5b562` as `verified: false`, reason `unsigned`. It points to source commit `d05598035de7b51ba460a0c2424a58b22b4f4e81`. The Android APK and AAB signatures were verified separately by CircleCI and the GitHub release publisher.

GitHub Release `439960831` is marked immutable. The exact source provenance and all four release assets were checked before publication. This release immutability is separate from a GPG/SSH signature on the Git tag; keep describing the tag itself as unsigned.

Never delete, recreate, or retarget the immutable `v1.1.14` release or tag. To sign future tags, configure an owner-managed GPG/SSH signing key in protected CI secrets and verify the tag signature before publication; do not store signing material in source or public artifacts.

Official verification commands:

```bash
gh release verify-asset v1.1.14 ./app-release.apk
gh release verify-asset v1.1.14 ./app-release.aab
sha256sum -c SHA256SUMS
```

## Current CI ownership

| Responsibility | Owner |
|---|---|
| PR/main source verification | GitHub Actions — ZIKR / Quality Gate |
| Main web build and docs | CircleCI — application-build-docs |
| Android source and Supabase gates | CircleCI — source-verify, supabase-production-gate |
| Android signing build | CircleCI — android-rebuild |
| Android verification and publication | GitHub Actions — publish-android-release-assets.yml |
| Controlled production web deploy | Vercel |
| Video generation / social publishing | GitHub Actions |
| Prayer/source-agent scheduling | Supabase pg_cron and Edge Functions |

## Release safeguards

- Never reuse a published semantic tag for a different source SHA.
- Never place old APK/AAB files under a newer tag.
- Never publish before signature, manifest, metadata, and checksum verification.
- Keep Android, package, footer, and iOS version metadata aligned.
- Never force-update main; abort on concurrent changes during release preparation.
- Do not apply database migrations as part of a metadata-only release update.
