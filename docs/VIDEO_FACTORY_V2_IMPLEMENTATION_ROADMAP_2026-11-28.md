# ZIKR Video Factory V2 — Implementation Roadmap

**Audit snapshot:** 2026-11-28 01:51 UTC  
**Scope:** Video generation, AI providers, FFmpeg rendering, template studio, scene and asset library, voice, captions, quality control, Cloudinary storage, social publishing, and Admin operations.

**Execution checkpoint — 2026-11-28 08:21 Africa/Cairo**

| Phase | Verified implementation/evidence | Remaining release gate |
|---|---|---|
| P00 Inventory and safety | Production Supabase project is healthy (PostgreSQL 17); 482 remote migrations are registered; Cloudinary cloud `dcuveyab9` is verified; private MP4 uploads succeeded and the test assets are authenticated. Current Cloudinary usage is 5.19/25 credits (20.76%). | Complete request/catalog/social-queue-to-Cloudinary reconciliation and preserve a settings snapshot before any production setting change. No deletion was performed. |
| P01 Providers | WAN Gradio contract repair and distinct WAN/LTX adapters are merged; Quality Gate passes. Cloudinary authenticated upload is verified. | Live WAN/LTX smoke generation is blocked by the Hugging Face free ZeroGPU quota at the last attempt (WAN needed 100s with 94s left; LTX needed 120s with 34s left). Re-run each provider separately after quota reset; no paid tier was enabled. |
| P02 Narration | Layl word-count preflight and revised episode scripts are merged; the post-TTS duration probe remains in place. | Validate a real Layl render once the private render path is available; do not publish during this test. |
| P03 Template Studio | Main worker resolves an audience-safe active immutable version and stores `templateVersionId`, `templateConfigSnapshot`, asset, format, and renderer metadata on new automatic requests. Selection contract is covered by tests. Production has 50 templates and 50 active versions. | Zero requests were created after the merge commit, so no production row has yet exercised the new binding. Verify the first post-merge request before marking acceptance complete. |
| P04 Storyboard | Versioned `zikr-storyboard-v1`, deterministic 2–6 scene planning, audience-safe asset selection, camera paths, fade transitions, FFmpeg graph, and persisted scene metadata are present; Quality Gate passes. | Render and probe a private MP4 to verify scene transitions, audio alignment, and duration end-to-end. |
| P05 Visual library | 50 database templates/versions and a large local SVG scene catalog exist, including general and Kids assets. Runtime asset checks are in the production workflow. | Complete asset rights/source metadata and preview coverage per template/aspect ratio before expanding the catalogue. |
| P06 Audio/captions | Arabic TTS smoke checks, pinned Layl voice profile, Noto Arabic fonts, audio normalization, and trusted caption rendering are present. | Complete phrase-level alignment and a private end-to-end presenter/series continuity render. |
| P07 Kids | Dedicated Kids content factory, age/audience separation, source/fiction contracts, Kids QA and 13-game source checks are present; Quality Gate passes. | Verify one private Kids storyboard render and confirm Kids-only assets remain isolated. |
| P08 QA | Automated technical/editorial approval contracts and PostgreSQL integration tests pass. | Add measured frame-sampling/visual-diversity evidence from real rendered samples and retain immutable QA snapshots for each canary. |
| P09 Storage/publishing | Cloudinary production account is confirmed; authenticated video upload works; generated video worker uploads directly to Cloudinary rather than Supabase Storage; social publishing contracts are tested. | Reconcile production catalog references with Cloudinary and verify platform remote IDs in a private/non-publishing canary. No media was deleted and no public post was triggered. |
| P10 Admin operations | Admin video controls, approvals, queue states, OMNIS ledger and settings governance contracts exist and pass current integration checks. | Align visible daily target with actual worker caps and add/verify private test-render controls and provider-health detail. |
| P11 Observability/rollout | Queue ledger, retries, cron reconciliation and integration checks exist. | Add per-stage timings/provider success metrics and complete the 3-private-preview canary before raising volume. |

**Current production safeguards:** `VIDEO_FREE_ONLY=true`; ComfyUI and custom paid-provider paths remain disabled; GitHub worker currently caps the daily target at 2 despite the Admin setting of 20; auto-publish is enabled on the scheduled production workflow. Therefore no production worker dispatch, public publishing, volume increase, or destructive media cleanup was run during this checkpoint.

## 1. Executive direction

ZIKR already has a functioning video pipeline. The next release should not replace it with a second generator. Keep GitHub Actions as the scheduled worker, Supabase as the job/configuration ledger, Cloudinary as the media origin, provider adapters for optional AI-generated visual layers, and FFmpeg as the deterministic final compositor.

The V2 objective is to move from **single-background rendered clips** to a **storyboard-driven video factory**. Each request should have an editorial brief, a pinned template version, a visual storyboard, narration and caption timing, an auditable asset list, and a quality report before it can be published.

The implementation must preserve:
- Source-locked Quran, Hadith, Dua, and Adhkar text.
- Server-rendered Arabic typography. Text-to-video models must not generate Arabic lettering, Quranic text, Hadith text, logos, or subtitles inside images.
- Kids safety and age-appropriate content controls.
- Immutable template versions and the existing deterministic FFmpeg fallback.
- Cloudinary media storage; do not create a duplicate public video bucket in Supabase Storage.
- Separate generation, internal site publication, and external social publication states.

## 2. Verified starting point

### 2.1 Production configuration and recent run data

At the audit snapshot:
- Supabase Admin settings reported video automation enabled, AI enabled, auto-publish enabled, batch size 10, daily target 20, video duration 25 seconds, and four AI attempts per run.
- The production GitHub video workflow also enabled the HF WAN and HF LTX adapters, used the order `hf_ltx_fast,hf_wan,template`, and kept `VIDEO_FREE_ONLY=true`.
- The workflow's provider flags are not proof that an external provider call succeeds. A provider is only considered healthy after a real test render is downloaded, probed, composed, and stored.
- The most recent 24-hour Supabase snapshot contained 6 requests: 4 completed, 1 retry_wait, and 1 cancelled. The 5 completed/template requests were recorded with provider `template`; the failed retry was a Layl narration-length failure.
- The prior 30-day snapshot contained 317 requests: 269 template, 29 HF LTX, 18 HF WAN, and 1 unrecorded provider. Template fallback reasons recorded in the worker were: AI attempt budget exhausted (158), provider command failed (60), Hugging Face Space unavailable (33), all configured providers failed (10), and reason not recorded (8).
- One recent Layl script produced 169.3 seconds of narration while the dedicated maximum was 120 seconds. This was detected after voice generation rather than during a preflight check.

These metrics are historical audit observations, not a live health guarantee. Re-run the same queries after each provider or workflow change.

### 2.2 Existing code and assets

The repository already includes:
- A scheduled GitHub Actions video worker and a distinct publishing workflow.
- Hugging Face WAN 2.2 and LTX Fast adapters, a deterministic FFmpeg template renderer, a provider router, bounded download validation, and fallback behavior.
- Fifty database templates with fifty active immutable template versions at the audit snapshot.
- A local SVG visual catalog, audience separation for general and Kids assets, category-specific composition presets, five camera paths, seeded composition variation, Arabic fonts, subtitle pagination, source cards, and audio normalization.
- A branded Layl program, Hady program, Kids story factory, source-locked Prophet-story flow, and automated QA checks.

The visual catalog is broader than the current shot design. The main renderer still composes a request around a selected background layer and an FFmpeg layout rather than building a true scene-by-scene storyboard. Template Studio's database versions are resolved by the worker only when the request carries `templateVersionId`; automatic requests observed in the audit did not carry `templateVersionId`, `templateAssetKey`, or `templateConfigSnapshot`. This is the priority integration gap: versioned Studio settings are not proven to be part of the automated production path.

### 2.3 Verified blockers and configuration gaps

| Area | Finding | Treatment |
|---|---|---|
| WAN 2.2 | The Gradio positional argument mapping was incorrect in the existing adapter. | Repair is in draft PR #497. Do not call WAN production-ready until Quality Gate and a real MP4 smoke test pass. |
| LTX Fast | Enabled in the workflow, but recent database evidence does not prove a successful provider render in the latest 24-hour window. | Keep enabled; verify the Space API, queue/ZeroGPU availability, downloaded MP4, and actual final render. |
| FFmpeg template fallback | Active and dominates recent output. | Keep as the deterministic safety path; increase visual storytelling so fallback is not synonymous with one repeated look. |
| Layl | All eight season scripts were longer than a reliable two-minute narration budget. | Script reduction and a 165-word preflight are in draft PR #498. Preserve the post-TTS duration probe. |
| Template Studio integration | Auto requests did not pin immutable template version IDs/config snapshots. | Implement deterministic template selection and persist exact version/config on every new auto request. |
| Daily volume | Admin setting says 20/day, while the seeder applies a hard internal ceiling of 2/day and a per-run ceiling. | Do not silently raise production volume. Confirm the desired ramp and capacity, then reconcile config, code, tests, and UI. |
| ComfyUI | Explicitly disabled in the production workflow. | Treat as intentionally disabled, not as a failed provider. Requires endpoint and authentication details before activation. |
| Free API provider | Disabled while free-only policy is active. | Do not enable an unknown endpoint or bypass the free-only guard without an explicit provider and budget decision. |
| Cloudinary inspection | The connected Cloudinary tool returned demo `samples/*` videos under cloud `lnsnp6km`, not identifiable ZIKR production videos. | Confirm the production Cloudinary cloud name/connection before asset reconciliation. Do not delete or move anything based on the demo account. |

## 3. Target architecture

Every video request should move through one canonical pipeline:

1. **Editorial brief** — category, audience, goal, source, language, platform format, target duration, content risk, and originality/attribution rules.
2. **Script contract** — hook, body, scene beats, closing, word budget, estimated speech time, sources, and editorial review state.
3. **Template resolver** — select an active immutable template version compatible with the audience and category; pin ID, version, asset key, and normalized config snapshot.
4. **Storyboard planner** — split the script into visual beats and select approved scene assets, movement, transitions, and caption windows.
5. **Provider router** — choose an enabled provider based on health, policy, capability, quota, and measured success; preserve separate adapters for WAN, LTX, and each additional provider.
6. **Voice and caption pipeline** — synthesize or retrieve approved narration, probe its true duration, align Arabic captions, and preserve source text.
7. **FFmpeg compositor** — combine the selected scenes, character layers, text, voice, source cards, transitions, end card, and brand identity into a valid MP4.
8. **Automated QA** — technical, editorial, visual diversity, Arabic typography, source, rights, Kids safety, and duplicate checks.
9. **Media registration** — upload the final deliverable to the canonical Cloudinary account, attach verified metadata, and persist the asset reference in Supabase.
10. **Distribution** — internal site catalog and each social platform receive independent, idempotent queue states and remote IDs.
11. **Observability** — persist per-stage timings, provider attempts, fallback reason, template version, render profile, QA findings, storage ID, and publishing outcomes.

The pipeline must not start a second rendering implementation in parallel. Extend the current worker and provider contracts.

## 4. Phased implementation plan

### P00 — Production inventory and safety baseline

**State:** Partial audit completed.

Deliver:
- A canonical inventory of every generation workflow, publisher, provider adapter, template, asset, voice profile, migration, and storage path.
- A read-only reconciliation of Supabase request IDs, catalog IDs, Cloudinary public IDs, and social-queue records.
- A verified Cloudinary account identity before any media cleanup.
- A provider-by-provider production readiness table.
- A backup of current Admin settings and workflow configuration before changing volume or provider flags.

Acceptance:
- Every production video asset has one canonical Cloudinary owner and a Supabase reference.
- No destructive cleanup is run without a reference audit and recoverable backup.
- A production job is not called healthy solely because an environment variable is set.

### P01 — Provider adapters and health routing

**State:** WAN adapter repair in draft PR #497; LTX requires a live smoke test.

Deliver:
- Fix the WAN 2.2 Gradio argument contract and keep a unit test that asserts each positional argument.
- Keep LTX's distinct 13-input contract covered by tests.
- Add a provider smoke-test command that performs a small, non-publishing generation, validates the downloaded MP4, and reports the result.
- Record health per provider: last success, last failure, error class, response time, queue time, quota exhaustion, and timeout.
- Add a circuit breaker so repeated provider failures do not consume every attempt in a worker run.
- Make fallback reason structured and machine-readable.
- Divide the AI-attempt budget across the batch rather than letting early requests exhaust it.
- Add per-provider concurrency and timeout limits.
- Add custom Hugging Face Space support only when its JSON configuration and endpoint contract are validated.

Acceptance:
- Two consecutive test renders per enabled provider succeed in a controlled test environment.
- Each resulting MP4 passes `ffprobe` and the final FFmpeg composition test.
- An unavailable provider is skipped quickly and the template fallback still completes the job.
- Paid providers remain disabled unless their credentials and budget are explicitly configured.

### P02 — Script, narration, and duration contracts

**State:** Layl script and preflight repair in draft PR #498.

Deliver:
- Apply word/time budgets before TTS. Use category-specific duration profiles rather than a single generic character limit.
- Keep actual audio duration as the final authority after TTS. If speech is too long, fail before expensive visual generation and return a clear editorial action.
- Support controlled shortening or splitting into multiple episodes; never truncate sacred text, source passages, or a quoted Hadith.
- Add duplicate-content checks before generating voice and before registering the final video.
- Preserve script versions and editorial decisions.
- Add voice-specific settings for Egyptian Arabic Layl, Modern Standard Arabic narration, Kids voices, and verified source audio.
- Retain source-locked religious references and never generate Quranic/Hadith text through a video model.

Acceptance:
- No standard short enters rendering when the estimated duration exceeds its profile.
- Every extended program has an explicit maximum duration and script contract.
- The final output duration matches the actual narration without cutting the final sentence.

### P03 — Connect Template Studio to automated generation

**State:** Highest priority after P01/P02.

Deliver:
- Add an audience/category-aware resolver over active `video_templates` and `video_template_versions`.
- Make assignment deterministic but balanced, using recent template usage, content category, audience, and campaign series.
- Persist `templateVersionId`, template identity/version, `templateAssetKey`, `templateConfigSnapshot`, and renderer version into each new automated request.
- Validate the pinned version and its audience before rendering.
- Apply palette, font preset, safe area, caption style, source-card style, audio policy, motion, and default format from the pinned immutable config.
- Ensure Studio preview and production render consume the same composition resolver.
- Add a migration/backfill only for historical rows whose template/media ownership can be safely proven; do not rewrite approved historical snapshots.

Acceptance:
- 100% of new automatic requests are pinned to one active immutable template version, except explicitly documented special renderers (Layl, Hady, source-locked Prophet stories).
- Admin preview and production output use the same template version/config.
- Changing a template creates a new version rather than changing the rendering of old requests.

### P04 — Storyboard and multi-scene visual engine

**State:** Design required; current renderer has seeded camera/layout variation but is not a full storyboard engine.

Deliver:
- Create a versioned `VideoStoryboard` contract: scene ID, narrative beat, start/end time, visual prompt, asset references, camera movement, transition, foreground/background layers, caption range, and safety tags.
- Support 3–6 meaningful shots for normal short videos; longer programs use scene counts derived from narration beats.
- Use transitions appropriate to each category: cut, dissolve, pan, zoom, parallax, light sweep, or chapter card.
- Add optional short AI-generated visual clips for eligible categories; use static/animated SVG, owned illustrations, and licensed stock as deterministic fallbacks.
- Keep Arabic lettering, sacred text, logos, and subtitles in the trusted renderer, not in generated frames.
- Avoid showing prophets or sacred figures. Use symbolic, respectful visual representations for religious history.
- Add continuity IDs for recurring Kids characters and program hosts.
- Add format profiles for 9:16, 16:9, and 1:1, including per-platform safe zones.

Acceptance:
- A standard short has at least three distinct scene beats when its content warrants them.
- Adjacent scenes are not identical background/shot combinations unless deliberately requested.
- The story beat and visual asset are traceable in the final request metadata.

### P05 — Visual asset library and template expansion

**State:** Existing 50 database templates and active versions; expansion deferred until P03 is connected.

Deliver:
- Organize assets by category: Quran/Adhkar, Hadith, Dua, Seerah/history, stories, general guidance, Kids science, Kids values, Layl, Hady.
- Give every asset a source, license/rights state, author, intended audience, allowed topics, focal point, colors, safe-area notes, and version.
- Add scene packs rather than only single backgrounds: desert/history, Islamic architecture, nature, books/manuscripts, stars/night sky, city life, classroom, ocean, forests, and studio environments.
- Build distinct composition systems: documentary, storybook, presenter-led, cinematic, kinetic typography, infographic, quiet devotional, and children’s animation.
- Expand from the current 50 DB templates only after each template has a preview, renderer contract, rights record, and sample MP4. Target catalogue size should be set by tested variety, not an arbitrary count.
- Generate thumbnail/poster variants for each aspect ratio and keep a branded ZIKR watermark in the final composition.

Acceptance:
- Every template has a rendered example in vertical and horizontal layouts, or a documented format restriction.
- All assets have a checked rights state and audience tag.
- Kids templates cannot resolve general-only assets and vice versa.

### P06 — Audio, Arabic captions, and presenter identity

Deliver:
- Keep Layl's Egyptian male voice pinned to the chosen profile; do not silently replace it with a generic voice.
- Keep a separate Modern Standard Arabic narration profile for educational/religious explainer videos.
- Add loudness normalization, clipping detection, silence detection, voice/music ducking, and end-pause handling.
- Replace duration-only caption estimates with a word/phrase alignment step when a trusted ASR/forced-alignment method is available. Keep the current page-level timing fallback if alignment is unavailable.
- Improve Arabic shaping, line breaks, diacritics policy, Naskh/Sans font mapping, punctuation, and platform-safe margins.
- For Layl/Hady, preserve character identity, presenter framing, voice consistency, and episode continuity.
- Use music only from owned or properly licensed sources; keep music optional and below narration.

Acceptance:
- No dropped narration, cut final word, clipped syllable, silent audio stream, or out-of-sync caption.
- The Arabic text rendered in the video is derived from the approved script, not generated in a picture.
- Presenter/character identity stays consistent across a series.

### P07 — Kids series and educational animation

Deliver:
- Extend existing Kids series with season/episode continuity, age bands, learning objectives, safe visual beats, and a source/fiction label.
- Add reusable character rigs/poses and scene packs for classroom, home, nature, space, ocean, science experiments, and moral stories.
- Add child-safe speech speed, vocabulary, music policy, and duration profiles.
- Keep fiction clearly marked as original fiction; keep prophet and companion stories source-locked and reviewed.
- Do not ask children for personal information or direct off-platform contact.

Acceptance:
- Every Kids video passes the stricter Kids QA policy before cross-listing.
- All recurring characters pass a series continuity test.
- No unreviewed religious attribution appears in Kids scripts.

### P08 — Automated video QA and human sampling

Deliver:
- Technical QA: MP4 container, H.264, AAC, expected resolution/FPS, non-zero duration, audio stream, black/frozen frame detection, corrupted frames, file size, loudness, and clipping.
- Visual QA: sample frames throughout the timeline, scene diversity, contrast/readability, safe zones, logo placement, and asset/script relevance.
- Script QA: source URL, exact source passage, word budget, religious-attribution guard, repetition, language, and audience.
- Media QA: verified Cloudinary response, asset ID, public ID, playback URL, thumbnail, and metadata integrity.
- Use an automated score with hard blocking rules. Human sampling should focus on religious accuracy, historical sensitivity, Kids safety, and a measured sample of general videos.
- Record QA engine/version and immutable QA snapshot to prevent later changes from silently altering a prior approval.

Acceptance:
- A technical pass is not enough to publish a low-quality or irrelevant video.
- Hard failures block both internal and external publication.
- Every rejection exposes a precise reason and a safe retry path.

### P09 — Storage, retention, and publishing

Deliver:
- Confirm the actual production Cloudinary `cloud_name` before audits or cleanup.
- Use one canonical media origin and persist stable asset identifiers, dimensions, duration, bytes, and delivery URLs.
- Do not copy generated MP4s into Supabase Storage.
- Add retention policies for temporary AI clips, failed staging assets, thumbnails, and superseded renders. Never delete an asset while it is referenced by a published catalog row or social queue.
- Reconcile successful YouTube/Facebook uploads with catalog metadata and retry only the incomplete platform.
- Keep per-platform publish state, remote media ID, permalink, scheduled time, deferred reason, and retry count.
- Make all publishing idempotent.

Acceptance:
- Each published platform has a confirmed remote ID/permalink before queue completion.
- Partial publishing can resume without duplicating a successful upload.
- No media cleanup occurs without a completed reference scan and recovery plan.

### P10 — Admin Video Operations Control Plane

Deliver:
- Provider health cards: enabled, policy mode, last success, last error, quota/timeout, average duration, success rate, and fallback percentage.
- Template Studio usage dashboard: requests by template/version, category, audience, and scene.
- Storyboard preview/editor with synchronized narration and caption timelines.
- Batch panel: queued, processing, retry_wait, completed, blocked, failed, cancelled, and published states.
- QA detail panel with sample frames, waveform, subtitles, metadata, source, and reasons for rejection.
- Cost/volume controls with explicit daily cap, per-run cap, provider attempt budgets, and publishing schedule.
- Secret completeness check that reports missing secret *names* only; never displays values.
- A safe "test render" action that renders one private preview without social or public site publishing.
- A production "Run Now" action that respects daily quotas, pause locks, and the no-publication test policy.

Acceptance:
- Admin settings and actual worker limits agree; no UI target can promise more jobs than the scheduler will process.
- A private test render never enters a public queue.
- Provider failures are visible without exposing credentials.

### P11 — Observability, performance, and rollout

Deliver:
- Per-stage timings: script, TTS, provider wait, provider inference, download, composition, QA, upload, and publishing.
- Metrics per provider, format, category, audience, and template.
- Alert on repeated provider failures, quota exhaustion, stale jobs, duplicate-content blocks, media upload failure, and partial social publishing.
- Track cost per completed video and storage/bandwidth per published video.
- Roll out in canary waves: 3 private previews; then 2–3/day; then 5/day; then 10/day; only move to the configured daily target after provider, QA, storage, and publishing reliability are measured.
- Retain instant rollback flags for each provider, storyboard renderer, template version resolver, and publishing path.

Acceptance:
- Canary batch passes technical and editorial review.
- Provider success, cost, and media delivery meet agreed targets.
- Daily volume is increased only by an explicit Admin configuration change after the user confirms capacity and budget.

## 5. Required configuration and ownership

### GitHub Environment: `production`

The video workflow validates these required secrets before work:
- `SUPABASE_SERVICE_ROLE_KEY` (or the existing alias `SUPABASE_SERVICE_KEY`)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The workflow also receives:
- `HF_TOKEN` (optional for public Spaces, but useful if the chosen Spaces/account path requires authentication)
- `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` for YouTube upload where enabled
- Alert secrets such as `ADMIN_QUEUE_ALERT_WEBHOOK_URL`, `ADMIN_QUEUE_ALERT_WEBHOOK_SECRET`, and `RESEND_API_KEY` when alert delivery is configured

Secrets must be entered directly in GitHub Environment settings. Never paste service-role keys, API secrets, OAuth secrets, or access tokens into chat, issues, documentation, or source files.

### Optional provider activation

ComfyUI is currently off and requires:
- `COMFYUI_ENABLED=true`
- `COMFYUI_BASE_URL`
- `COMFYUI_API_KEY` (only if the endpoint requires it)

An additional free/custom video API requires an explicitly selected provider, a validated HTTPS endpoint, and:
- `FREE_VIDEO_PROVIDER_ENABLED=true`
- `FREE_VIDEO_PROVIDER_ENDPOINT`
- `FREE_VIDEO_PROVIDER_API_KEY` (only if required)
- A deliberate review of `VIDEO_FREE_ONLY` policy before any non-free endpoint is permitted

Custom Hugging Face Spaces can be declared through `HF_VIDEO_CUSTOM_SPACES` as a JSON array of approved Space IDs, variants, and enabled flags. Each custom Space is untrusted by default and must not receive the production HF token.

### Cloudinary account confirmation

The connected Cloudinary inspection context returned demo assets under cloud name `lnsnp6km`, including `samples/*` videos. This does not establish that the production GitHub secret is wrong; it means the connected inspection context did not expose identifiable ZIKR production assets. Confirm the actual production `CLOUDINARY_CLOUD_NAME` and reconnect the matching account before performing media reconciliation or cleanup.

## 6. Decisions required before increasing production volume

1. Admin currently stores `video_automation_daily_target=20`, but the seeder code applies an internal hard ceiling of 2/day and a per-run ceiling. Confirm whether the intended target is **20 videos/day**, or whether production should remain at **2–3/day during stabilization**. Do not raise volume until confirmed.
2. Confirm that the currently connected Cloudinary account/cloud name is the correct ZIKR production account. Share only the non-secret cloud name; keep the API key/secret in GitHub Environment.
3. Confirm whether ComfyUI or an additional external free-video API should actually be activated. If so, supply its endpoint and configure credentials directly in GitHub Environment; do not bypass the free-only cost guard by assumption.
4. Confirm the owned/licensed asset policy for stock footage and music. Until then, use original/local assets or explicitly licensed media only.

## 7. Release gates

A phase is complete only when:
- Code and migration changes are committed in a dedicated branch.
- Unit/contract tests pass.
- The relevant integration/Quality Gate passes.
- A preview MP4 is created and verified when the phase changes rendering.
- Production settings are read back and reconciled where applicable.
- No unrequested public social post or irreversible media deletion occurred.
- The roadmap status and evidence links are updated.

**Current status after execution checkpoint:** PRs #497, #498, and #499 are merged. The merge-commit Quality Gate passed all 32 PostgreSQL integration checks and the canonical source/architecture gate. P01 adapter repair, P02 Layl preflight, P03 template-version binding, and P04 storyboard implementation are present in `main`; P03/P04 production acceptance remains pending a post-merge private render. P00 and P05–P11 retain the release gates in the execution checkpoint above. The last HF provider smoke attempt was quota-blocked, not credential- or adapter-blocked. Do not claim the full V2 plan complete until the remaining live-render, reconciliation, QA, Admin, and observability gates pass.
