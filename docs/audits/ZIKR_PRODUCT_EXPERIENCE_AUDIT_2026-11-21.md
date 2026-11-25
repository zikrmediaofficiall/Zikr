# ZIKR — Product Experience Audit
**Date:** 21 November 2026  
**Scope:** Public site, content discovery, home and section navigation, audio/reminders, published learning content, hadith resilience, and admin access/navigation boundaries.

## Executive summary
This audit combines a public-route inventory, source-level inspection of page and service code, a point-in-time review of production runtime error summaries, and focused changes with regression contracts. It is not a claim that every authenticated screen was manually exercised with a privileged account.

## Route and navigation review
- The repository contains 143 App Router page files. Public routes were checked against the route-specific content layer and its dynamic-detail prefixes; no public page route was left without a matching content/help path in the inventory. Admin, authentication, and account-private routes are intentionally excluded from the public editorial layer.
- The canonical section catalogue has eight top-level groups: Quran/revelation, remembrance, daily tools, history, knowledge, audio, kids, and platform.
- Home previously filtered the catalogue to four groups. It now renders all eight and keeps each group preview compact, directing users to the full sections directory for the remainder.
- Dedicated editorial guides already existed for many major routes. The new content layer now suppresses its base-page guide on routes with an existing dedicated guide, avoiding stacked, repetitive blocks. Dynamic detail routes retain focused guidance.

## Content quality and safety
- Quran text is served from the committed local Mushaf corpus, with the server code checking for the expected 6,236 ayahs before using it as a source.
- Hadith library content exists locally; the offline manifest records 2,964 hadith rows. The new fallback loader validates the local books and records, admits only rows marked published=true, rejects rows linked to unknown books, and removes duplicate book/number pairs.
- The hadith snapshot is used only after a database transport failure. A successful empty published-only database result remains authoritative, so a deliberate unpublish is not silently undone by the local or external catalogue.
- Dua, story, prophet, companion, scholar, article, and kids catalogues were found in the repository already. The work prioritizes reliable visibility, source attribution, and page-specific context rather than generating duplicate records.
- The 12-item emergency dua fallback is expanded with eight additional Quranic supplications, and the 18 known fallback items with traceable references now expose direct Quran/Sunnah source links on both the index card and detail page.
- Kids material remains subject to the existing publication/age-appropriateness gate. Content lacking the required review metadata is not surfaced merely to increase the visible item count.
- On the adhkar page, virtue/reward copy now appears only when a direct source URL is present. Referenced items link to their hadith source; text without a verified source can remain readable without displaying an unsupported virtue claim.

## Audio and reminders
- A curated human-recorded audio library already contains 10 entries in each of three categories: adhan, salawat, and dhikr.
- The site-audio service now uses that reviewed catalogue when the database service is unavailable, and fills only categories that have no database rows. Existing database rows remain authoritative for their own category.
- Notification sound selection is now category-safe. Dhikr reminders no longer borrow an adhan file on Android or iOS; when there is no bundled dhikr notification sound, the operating system's default notification sound is used instead.
- Generic synthesized beeps were removed as substitutes for devotional recordings. The player now does not mislabel a synthetic tone as an adhan, dhikr, or salawat recording.
- Regression tests cover category-specific notification sounds, curated audio category availability, sourced adhkar virtues, and homepage group visibility.

## Admin surface and permissions
- Admin pages are protected by server-side admin authentication and per-feature permission checks; role resolution is fail-closed for unknown roles. The audit did not bypass the login wall or attempt to impersonate an administrator.
- The admin navigation/console foundation from PR #428 is already merged into main. This audit's review of protected admin screens remains limited to source inspection; privileged role-by-role verification still requires an approved maintainer test session. A full live review of protected screens, role-by-role access, MFA/step-up paths, and mutation permissions still requires a maintainer-authorized test account and an approved review session.
- This branch does not weaken RBAC, RLS, MFA, step-up verification, or CODEOWNERS.

## Production reliability observations
- Vercel's runtime error summary recorded 11 fetch-failed events in the last 24 hours, affecting public requests involving the home page, Quran, hadith, dua, and an editorial route. The recorded causes included transport/socket timeouts to the Supabase/Cloudflare endpoint.
- These logs demonstrate backend transport instability, not by themselves a confirmed user-visible HTTP 500. Existing Quran, dua, article, story, and hadith services have offline/fallback paths; this branch strengthens the hadith path with a published-only local snapshot.
- The production domain was still serving the main-branch deployment when this audit started. None of these changes should be described as live until the dependent PRs are reviewed, merged, and a production deployment is verified.

## Validation status
- Static route coverage: all 143 App Router page files matched by a route-specific page entry, an applicable detail prefix, or an intentionally private/admin exclusion.
- Added regression contracts for homepage visibility, source-backed adhkar rewards, curated audio availability, notification sound category isolation, and offline hadith snapshot validation.
- The original branch's source-verify result is not accepted as validation for this rebased copy. The current branch must pass the full Quality Gate, Vercel Preview, and applicable CircleCI source/config/build checks before merge.
- The original changes were developed before the latest release fixes. They are being reapplied to a clean branch based on the current main commit and must pass the current Quality Gate, Vercel Preview, and release-source checks before merge.
