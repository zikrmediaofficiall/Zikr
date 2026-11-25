# Android Release Recovery

The canonical CircleCI release branches use the format `android-release-vX.Y.Z` and must match both `package.json.version` and `.release-tag`.

For a tag whose APK/AAB assets are missing or whose prior Android build failed:

1. Create or update the canonical `android-release-vX.Y.Z` branch from the intended release commit.
2. CircleCI validates the release metadata, builds and signs the APK/AAB, uploads the artifacts and checksums to the `android-releases` Supabase bucket, and updates the `android_release` site setting.
3. The Android publisher runs from that exact release branch, waits up to 60 minutes for the CircleCI artifacts, verifies release metadata, checksums, APK signature, manifest, and signed AAB, then uploads (replacing stale files) the verified binaries to the matching GitHub Release and publishes it.
4. Do not manually mark a release complete before the signed binaries, checksum file, and metadata pass validation.

The normal semantic tag trigger remains supported. The branch recovery path exists specifically for release tags that already exist but previously failed to publish Android assets.


## Recovering a stuck Admin Release

Use **Admin → Release Center** when the current Android release operation has been stuck for at least six hours, or when the protected tag-signing dispatch is explicitly recorded as failed.

1. Open the recovery panel for the exact recorded tag and commit.
2. Confirm the checkbox and choose **Delete stuck release and recreate it**.
3. The server cancels active signing/publishing GitHub Actions runs for that exact commit, rechecks the release/tag identity, deletes only an unpublished draft release and its matching tag only when the tag resolves to the exact recorded commit (a failed signature can therefore be repaired), then dispatches the protected signing workflow again with the same tag and commit.
4. Follow the new signing workflow and CircleCI Android build. The release remains a draft until the signed APK/AAB and checksum verification complete.

The action requires the `release.manage` permission and step-up authentication. It refuses to run against a recent operation, a changed `main` commit, a published/immutable Release, a tag whose resolved target cannot be verified against the exact recorded commit. It never increments the app version or creates a replacement source commit. If the Release is already published, use a new semantic version instead; immutable published releases are never deleted or retargeted.


## Owner-triggered signed-tag fallback

When the Admin Release Center is unavailable but the release metadata is already merged to `main`, the repository owner can trigger the same protected signer by pushing a commit to a branch named `android-release-sign-vX.Y.Z`. The signer accepts only the repository owner for this push path, resolves the source from the current `main` head (not the request branch), requires the matching canonical package version and `.release-tag`, and waits for a successful protected GPG preflight on that exact `main` commit. It then creates the annotated GPG tag and draft Release itself; it never accepts a commit or release body from the trigger branch. The ordinary Admin `workflow_dispatch` path remains available.
