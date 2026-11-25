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
| P05-01 site experience management | Partial | `/admin/omnis/studio` (read-only), `/admin/sections` | no menu/theme editing, no preview | 3eea40c |
| P05-02 page and component builder | Built (flagged CUSTOM_PAGES_ENABLED) | `site-content/pages/*`, `/p/[slug]`, `/admin/omnis/pages`, migration 20261125200000 (not applied) | typed blocks only, no free HTML | 2782d8e, 37bd982 |
| P05-03 Android management | Partial | `/admin/android`, `c53e718` signing/app-links readiness, push readiness | notification management beyond readiness check | c53e718, d8be417 |
| P06-01 unified content management | Built (migration file, not applied, enforcement off) | `/admin/library`, `/admin/editorial`, `content-schedule.ts`, migration 20261125210000 source gate for `kids_game_questions` and `media_assets` (transition-only, per-table `omnis_source_gate_config`) | needs apply + enabling; 30 published media_assets have no source | 4b465bd, this commit |
| P06-02 verification and documentation | Built (flagged SOURCE_TEXT_CHECK_ENABLED) | `source-verification.ts`, `publish-gate.ts`, `quote-verification.ts` + service (Quran/hadith quotes vs corpus) | Uthmani spelling matched with alef-folding; untested against live publish | 4b465bd, 73806cb, 5f642c3 |
| P06-03 editorial governance | Built | `editorial/review-transitions.ts`, audited unpublish | none known | 10d6f8f |
| P07-01 model and provider management | Built (optional AI_PROVIDER_BUDGETS) | Gemini route `a6cf276`; `spiritual-ai/services/provider-budget.ts` per-model daily request/output-token budgets, exhausted models skipped, test | counters are per process (not a global billing cap); output tokens estimated from text length; no admin UI | a6cf276, this commit |
| P07-02 video and audio factory | Partial | `/admin/video/*`, video job, templates | unification is existing admin; not re-audited against plan | existing |
| P07-03 quality and asset gate | Partial | `verify-video-qa`, automated QA checklist, rights gate | not re-audited against plan | existing |
| P08-01 accounts and channels | Partial | `/admin/social` | not re-audited (OAuth state per account) | existing |
| P08-02 scheduling and queues | Partial | `social_publish_queue`, publish schedule and claim logic | not re-audited | existing |
| P08-03 post-publish tracking | Partial | `social_post_insights`, youtube/facebook ids | not re-audited | existing |
| P09-01 analytics data layer | Built | `admin/services/analytics-completeness.ts` | none known | 85ced85 |
| P09-02 audience and content analytics | Partial | `/admin/analytics`, GA4/YouTube contracts | not re-audited | existing |
| P09-03 growth, revenue, SEO | Partial | traffic-revenue panel, `/admin/seo`, `/admin/video/performance` | not re-audited | existing, 5b6ee1a |
| P10-01 workflow designer | Built (flagged AUTOMATION_ENGINE_ENABLED) | `/admin/omnis/workflows` designer form, `automation/workflow-designer.ts` (+test), saves disabled | schedule triggers not wired; form-based, not a visual canvas | this commit |
| P10-02 execution reliability | Built (flagged) | `automation/workflow-store.ts` DB-backed runs: idempotency, rate limit, retry, timeout, dead-letter list; migration 20261125180000 not applied | only notify_admin and revalidate_path execute; other actions dead-letter; verification is recorded, not machine-checked | this commit |
| P10-03 approvals, kill switch, recovery | Built (flagged) | dry run default, approval by a different admin, per-workflow disable, global AUTOMATION_KILL_SWITCH | pause/resume queue not wired to executor | this commit |
| P11-01 cloud services center | Partial | `admin/services/platform.ts` (GitHub, workflows, health) | no Vercel/Supabase/storage panel | existing |
| P11-02 database and API studio | Built (read-only static) | `/admin/omnis/database`, `scripts/lib/db-inventory.mjs`, generated inventory (97 tables with RLS and policy counts, 481 migrations, 76 API routes) + freshness test | reflects repo files not the live DB; no query console or live migration status | this commit |
| P11-03 code development center | Not built | none | branches, PRs, reviews view | none |
| P12-01 fine-grained permissions, SoD | Built (optional ADMIN_ABAC_POLICY) | RBAC `permissions.ts`, SoD flag `b84de20`, `admin/services/abac-policy.ts` environment/scope rules restricting step-up actions, test | rules only restrict; scope tag is not yet passed by callers; applied in requireAdminStepUp only | b84de20, this commit |
| P12-02 security and secrets monitoring | Built | `verify-no-committed-secrets`, `/admin/security` | none known | 6d7957e |
| P12-03 backup and recovery | Partial (tooling built) | runbook, `scripts/restore-drill.mjs` offline dump analyzer + test | no managed backups exist; a real restore into a scratch DB was NOT performed | ca046ea, this commit |
| P13-01 specialist agents | Scaffold | `omnis/agents.ts`, migration `20261125190000` | flag off | 627c714 |
| P13-02 tools and resource scoping | Scaffold | scoped authorization in `agents.ts` | flag off | 627c714 |
| P13-03 analysis and repair orchestration | Not built | proposal table only | orchestration and review UI | none |
| P14-01 contract and integration tests | Built | static RLS and admin-guard checks, ~190 test files | E2E needs live env | 4fdc67d |
| P14-02 load and recovery tests | Not built | none | runnable-without-live tests | none |
| P14-03 gradual release and closure | Partial | `/admin/release`, release gates | closure needs live Preview/Staging and human approval | existing |

"Partial: not re-audited" means I saw the code exist but have not yet compared it with the plan wording.
