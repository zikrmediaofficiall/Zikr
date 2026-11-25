# OMNIS per-task status (P03 to P14)

Snapshot taken on branch `feat/zikr-omnis-control-plane-20261125` at head `bc8adb8`, before the final build-out.
Nothing here is applied to the live database. Migrations are files only. No task is marked complete in the ledger
(Supabase Preview and ledger-SHA gates cannot be met), so "built" means code and tests exist on this branch.

Legend: **Built** = deliverable implemented with tests. **Partial** = real code exists but part of the deliverable
is missing (the gap is named). **Scaffold** = pure logic and migration file behind an off-by-default flag, no UI or
no DB runner yet. **Not built** = nothing exists for the deliverable.

| Task | Status | Evidence (code) | Gap to the plan's deliverable | Commit |
|---|---|---|---|---|
| P03-01 operational status board | Built | `src/features/admin/services/omnis-module-status.ts`, `src/features/admin/omnis/module-status.ts`, `/admin/omnis` | none known | 9b1f04b |
| P03-02 alerts and incidents | Built | `omnis/incidents.ts`, `omnis/incident-lifecycle.ts` (acknowledge, resolve, history, owner via `incident.owner`) | none known | 4f5ba05, c930300 |
| P03-03 safe quick commands | Built | `omnis/commands.ts`, `/admin/omnis/actions.ts` (step-up, confirmation phrase, audit) | none known | 53632df |
| P04-01 resource index | Built | `omnis/resource-index.ts`, `/admin/omnis/project` | none known | 0168a8e |
| P04-02 dependency map | Built | `omnis/import-graph.ts`, generated graph | code only, non-code resources use area fallback | 53632df |
| P04-03 pre-change impact analysis | Built | `evaluateOmnisChangeScope` in `omnis/resource-index.ts`, `scripts/omnis-change-scope.ts` (`pnpm omnis:impact`), test | not wired as a required CI gate | 5f642c3 |
| P05-01 site experience management | Partial | `/admin/sections` (visibility/order), `/admin/omnis/studio`, custom pages with versions/preview/publish (`/admin/omnis/pages`) | menus and themes are code-defined (`lib/navigation/catalog`); editing them needs a DB-driven navigation refactor, not done | existing, 2782d8e |
| P05-02 page and component builder | Built (flagged CUSTOM_PAGES_ENABLED) | `site-content/pages/*`, `/p/[slug]`, `/admin/omnis/pages`, migration 20261125200000 (not applied) | typed blocks only, no free HTML | 2782d8e, 37bd982 |
| P05-03 Android app management | Built up to the send boundary | `/admin/android` (release, signing, links, readiness), `/admin/notifications`, `/admin/omnis/push` campaign drafts with second-admin approval, daily limit, internal-link rule, read-only audience sizing, migration 20261125220000 (not applied) | NO sender is wired: nothing is ever pushed to users; sending needs an owner-approved sender | existing, this commit |
| P06-01 unified content management | Built as a file only; owner decided NOT to enable (message 18033743) | `/admin/library`, `/admin/editorial`, `content-schedule.ts`; migration 20261125210000 (source gate for `kids_game_questions`, `media_assets`) stays unapplied and off; not to be expanded | source requirement remains on `content_library` only by owner decision | 4b465bd, 5b565ac |
| P06-02 verification and documentation | Built (flagged SOURCE_TEXT_CHECK_ENABLED) | `source-verification.ts`, `publish-gate.ts`, `quote-verification.ts` + service (Quran/hadith quotes vs corpus) | Uthmani spelling matched with alef-folding; untested against live publish | 4b465bd, 73806cb, 5f642c3 |
| P06-03 editorial governance | Built | `editorial/review-transitions.ts`, audited unpublish | none known | 10d6f8f |
| P07-01 model and provider management | Built (optional AI_PROVIDER_BUDGETS) | Gemini route `a6cf276`; `spiritual-ai/services/provider-budget.ts` per-model daily request/output-token budgets, exhausted models skipped, test | counters are per process (not a global billing cap); output tokens estimated from text length; no admin UI | a6cf276, this commit |
| P07-02 video and audio factory | Partial | `/admin/video/*` (templates, scenes, voice, render, queue), hook experiment, SEO tags, poster/hook frame (142bc29..a55ae59) | audio bed needs licensed assets; no single unified script-to-render editor | existing |
| P07-03 quality and asset gate | Covered by existing code (audited) | `scripts/verify-video-qa.mjs` asserts audience classification (general/kids), `rightsReviewed`, `audienceCta`, backfill classification; `video-qa-backfill-policy.test.ts`, `video-source-approval.test.ts` | media-level checks beyond QA checklist not re-verified live | existing |
| P08-01 accounts and channels | Covered by existing code (audited) | `social/services/platform-availability.ts` per-platform `authBlocked`/`unavailable` state, `facebook-oauth-policy.ts`, `oauth-state.ts`, `/admin/social` | one account per platform; no multi-account switcher | existing |
| P08-02 scheduling and queues | Covered by existing code (audited) | `social_publish_queue` + `social_sync_jobs` (attempts, next_attempt_at, locked_at, unique source key), `social-queue-selection.ts`, `social-publish-recovery-policy.ts`, per-platform results, `social-platform-isolation.test.ts` | per-channel schedule UI not re-audited | existing |
| P08-03 post-publish tracking | Covered by existing code (audited) | `facebook_post_id`/platform ids on queue and jobs, `social_post_insights`, `social-insights-sync-status.ts`, youtube/facebook insights services | post URL is derived, not stored as its own column | existing |
| P09-01 analytics data layer | Built | `admin/services/analytics-completeness.ts` | none known | 85ced85 |
| P09-02 audience and content analytics | Built (aggregate, privacy-safe) | `/admin/analytics`, `/admin/omnis/growth`, `omnis/growth-report.ts` per-platform totals from latest snapshots, weekly trend, audience counts hidden below 10, test | no demographic segments (none collected by design) | existing, this commit |
| P09-03 growth, revenue, SEO | Partial (revenue source missing) | traffic-revenue panel, `/admin/seo`, `/admin/video/performance`, `/admin/omnis/growth` growth trend and revenue block with actual/estimated kept separate and null when no source | no connected revenue source (AdSense/YouTube Partner), so no revenue figures; no campaign dashboards | existing, this commit |
| P10-01 workflow designer | Built (flagged AUTOMATION_ENGINE_ENABLED) | `/admin/omnis/workflows` designer form, `automation/workflow-designer.ts` (+test), saves disabled | schedule triggers not wired; form-based, not a visual canvas | this commit |
| P10-02 execution reliability | Built (flagged) | `automation/workflow-store.ts` DB-backed runs: idempotency, rate limit, retry, timeout, dead-letter list; migration 20261125180000 not applied | only notify_admin and revalidate_path execute; other actions dead-letter; verification is recorded, not machine-checked | this commit |
| P10-03 approvals, kill switch, recovery | Built (flagged) | dry run default, approval by a different admin, per-workflow disable, global AUTOMATION_KILL_SWITCH | pause/resume queue not wired to executor | this commit |
| P11-01 cloud services center | Built (read-only) | `/admin/omnis/cloud`, `omnis/cloud-services.ts` Vercel env/commit, Supabase host/keys/connection, Cloudinary, GitHub token presence (no secret values), test; GitHub status stays in `admin/services/platform.ts` | no deployments list, DB size or storage usage numbers (needs Vercel/Management API tokens not in app env) | this commit |
| P11-02 database and API studio | Built (read-only static) | `/admin/omnis/database`, `scripts/lib/db-inventory.mjs`, generated inventory (97 tables with RLS and policy counts, 481 migrations, 76 API routes) + freshness test | reflects repo files not the live DB; no query console or live migration status | this commit |
| P11-03 code development center | Built (read-only) | `/admin/omnis/code`, `omnis/code-center.ts` open PRs and branches from GitHub with link safety, test | no merge or branch actions by design; needs public repo or valid token | this commit |
| P12-01 fine-grained permissions, SoD | Built (optional ADMIN_ABAC_POLICY) | RBAC `permissions.ts`, SoD flag `b84de20`, `admin/services/abac-policy.ts` environment/scope rules restricting step-up actions, test | rules only restrict; scope tag is not yet passed by callers; applied in requireAdminStepUp only | b84de20, this commit |
| P12-02 security and secrets monitoring | Built | `verify-no-committed-secrets`, `/admin/security` | none known | 6d7957e |
| P12-03 backup and recovery | Partial (tooling built) | runbook, `scripts/restore-drill.mjs` offline dump analyzer + test | no managed backups exist; a real restore into a scratch DB was NOT performed | ca046ea, this commit |
| P13-01 specialist agents | Scaffold | `omnis/agents.ts`, migration `20261125190000` | flag off | 627c714 |
| P13-02 tools and resource scoping | Scaffold | scoped authorization in `agents.ts` | flag off | 627c714 |
| P13-03 analysis and repair orchestration | Built (review UI + intake, flagged OMNIS_AGENTS_ENABLED) | `/admin/omnis/agents`, `omnis/agent-store.ts`: scoped intake with budgets/limits and run log, human approve/reject/applied transitions by agent permission | no runner that calls a model to generate proposals; applying a proposal is manual | this commit |
| P14-01 contract and integration tests | Built | static RLS and admin-guard checks, ~190 test files | E2E needs live env | 4fdc67d |
| P14-02 load and recovery tests | Built (no live env) | `scripts/tests/omnis-load-recovery.test.ts`: 10k-event burst vs rate limit/idempotency, retry/dead-letter recovery, kill switch, budget cap, 50k-row dump analysis | pure cores only, not a live load test | this commit |
| P14-03 gradual release and closure | Not closable by me | `/admin/release`, release gates | needs live Preview then Staging then production with human approvals; Supabase Preview is always skipped. Ledger stays open | existing |

"Partial: not re-audited" means I saw the code exist but have not yet compared it with the plan wording.
