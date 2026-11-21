# ZIKR Controlled Release

## Development policy

ZIKR does not use Vercel Git integration as the production deployment loop.

- Pull requests and main run the GitHub quality gate.
- GitHub Actions also runs the read-only Supabase Production Health gate against the live production project.
- The canonical command is `pnpm verify`.
- Routine CircleCI source verification and background runs are disabled to avoid duplicate plan usage; CircleCI remains for Android build/signing after the Admin Release service creates the semantic release tag, plus explicitly enabled recovery/release pipelines.
- `vercel.json` disables automatic Git deployments.
- No feature-branch or ordinary main push is expected to create a Vercel production deployment.
- Production deployment is performed only by the manual Vercel release workflow.

## Phase release policy

A phase is release-ready only when its branch is complete and the pull request quality gate is green.

1. Finish the phase on its feature branch.
2. Open or update the pull request to main.
3. Wait for ZIKR Quality Gate to pass.
4. Review the final diff, paths, checks, migrations, and phase acceptance criteria.
5. Merge to main.
6. Manually run ZIKR Production Release from main.
7. Enter RELEASE as confirmation and provide the phase or milestone name.
8. The release workflow re-runs `pnpm verify:pr` on the exact release commit before Vercel deployment.
9. Vercel deploys the prebuilt artifact once.
10. Verify the resulting production deployment is READY and points to the exact release commit.

## Required GitHub Actions secrets

The release workflow requires:

- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

These are CI secrets and must never be committed to the repository.

## Current production identity (verified 2026-10-21)

- GitHub repository: `zikrofficial-X/Zikr`
- Vercel project: `zikr`
- Vercel project ID: `prj_bnBQb7DIXB5iE2mZJAghtAoZuKGs`
- Vercel team slug/name: `zikr3` / `zikr`
- Vercel team ID: `team_RxPjmgZoSFmKGjScefYmwIVv`
- Supabase project name: `Zikrmediaofficial-X`
- Supabase project ref: `zqtssvlvmkzeeyqghqfk`
- Production domain: `https://zikrmediaofficial.vercel.app`

The Vercel project is linked to the GitHub repository above, and the Supabase project ref is the active project used by the production-health workflow. Treat these identities as the current release targets; re-verify them through the connected provider contexts before changing deployment secrets. Never commit `VERCEL_TOKEN`, database passwords, or Supabase service-role keys.

## Important

The current GitHub connector does not expose branch-protection or ruleset write operations. The quality workflow is implemented, but whether its checks are formally required for merging must be verified in GitHub Repository Settings; configure required status checks there before treating the gate as mandatory.


## Cryptographically signed Git tags

GitHub REST's annotated-tag creation endpoint cannot create a cryptographic signature. ZIKR uses two protected GitHub Actions workflows and never labels a REST-created tag as signed.

1. From the Admin Release Center, run the read-only Android signing preflight on the exact current `main` SHA.
2. The preflight runs in the protected `android-release-signing` Environment, imports the owner-managed GPG private key, checks its exact fingerprint, verifies a signed test payload, and confirms the public key and signer email are registered on the GitHub owner account.
3. Only after that exact-SHA preflight passes does the Admin Release action create the atomic version metadata commit on `main`.
4. The Admin Release service dispatches `sign-android-release-tag.yml` with the semantic tag and exact prepared commit SHA.
5. The protected signing runner creates an annotated tag using `git tag -s`, verifies it locally with `git verify-tag`, pushes it, then requires GitHub API verification `verified=true`, `reason=valid`, and the exact expected target SHA.
6. Only then is the Draft Release created. The tag push starts the existing CircleCI signed Android build. The GitHub asset publisher independently verifies the cryptographic signature and source SHA before upload/publication.

### GitHub Environment `android-release-signing`

Required secrets:
- `ANDROID_RELEASE_TAG_GPG_PRIVATE_KEY`: ASCII-armored GPG private key.
- `ANDROID_RELEASE_TAG_GPG_PASSPHRASE`: GPG passphrase (may be empty only for an unencrypted key).

Required environment variables:
- `ANDROID_RELEASE_TAG_GPG_FINGERPRINT`: trusted 40-character primary key fingerprint.
- `ANDROID_RELEASE_SIGNING_EMAIL`: email registered on the GitHub owner's GPG key.
- `ANDROID_RELEASE_SIGNING_NAME`: tagger display name.
- `ANDROID_RELEASE_SIGNING_GITHUB_USER`: GitHub user account where the public GPG key and signer email are registered (this may differ from the repository owner if the repository belongs to an organization).

The public key must be uploaded to the repository owner's GitHub account with the same email and fingerprint. If any setting is absent or mismatched, the preflight fails without creating a version commit or tag. Never delete or retarget an existing immutable release to retrofit a signature.
