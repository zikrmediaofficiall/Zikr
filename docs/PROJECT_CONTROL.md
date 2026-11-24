# ZIKR — Project Control and Release Identity

**Effective date:** 24 November 2026

## Canonical project identity

- GitHub repository: `zikrmediaofficiall/Zikr` (repository ID `1416064644`)
- GitHub control account: `zikrmediaofficiall` (repository owner; Admin permission verified)
- Vercel account username: `zikrmediacontact-7177`
- Vercel team: `zikrmediaofficial` / `zikrmediaofficial1`
- Vercel team ID: `team_AIjRfjTq0HWRiTWbvTVpVolg`
- Vercel project: `zikr`
- Vercel project ID: `prj_aruq5Q3gsE8DhgV86iIvz2WrVzEj`
- Linked source: `zikrmediaofficiall/Zikr`
- Production domain: `https://zikrmediaofficial.vercel.app`
- Canonical Supabase project: `zqtssvlvmkzeeyqghqfk`

The connected GitHub and Vercel sessions resolve to the same account email. The email itself is not stored in this public repository.

## Release authorization

The release preflight uses GitHub's authenticated repository metadata. It requires:
1. The release commit to resolve to a merged pull request targeting `main`.
2. The PR author login to equal the canonical repository owner (`zikrmediaofficiall`).
3. The PR source branch repository to equal `zikrmediaofficiall/Zikr`; fork-originated releases are rejected.
4. The exact PR-head checks and exact release-commit Quality Gate to complete successfully.
5. Required CircleCI contexts and, for post-deployment smoke verification, the Vercel status to be successful.

Android release preparation commits are resolved through their sole parent only to identify the originating merged PR. The actual release source SHA is still checked for its own exact Quality Gate and required statuses.

## Removed from active enforcement

- The `.github/CODEOWNERS` file.
- The release-gate helper that parsed individual CODEOWNER review submissions.
- CODEOWNER-specific steps and summary claims in production web release, Android publishing, and production smoke workflows.

No CODEOWNER reviewer account, review request, or reviewer-specific permission is required by the source-controlled release preflight.

## Security controls that remain

This change removes the CODEOWNERS review mechanism only. It does not remove:
- GitHub repository ownership and Admin/Write access controls.
- Protected GitHub Actions production environments and scoped secrets.
- Exact-commit Quality Gate, CircleCI, Vercel readiness and production smoke checks.
- Android keystore signing and tag/release verification requirements.
- Application role-based access control, MFA/step-up verification, Supabase RLS, and server-only credentials.

Do not place Vercel, Supabase service-role, OAuth, or Android signing secrets in source files or public documentation.
