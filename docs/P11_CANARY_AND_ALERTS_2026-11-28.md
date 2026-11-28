# P11 canary rollout and alert rules (proposal)

Status: plan only. Nothing here changes settings. DAILY_VIDEO_TARGET stays 2 and
the HF provider flags stay off until the owner changes them in Admin.

## Canary waves (new engine)

1. Wave 0: 3 private previews. Rendered by the worker with no site and no social
   publication. Reviewed in /admin/video/review and the QA panel.
2. Wave 1: 2 per day, still held for approval. Run 3 days.
3. Wave 2: 3 per day. Run 3 days.
4. Later waves (5, then 10) only by an explicit Admin change by the owner.

Gate to leave a wave (all must hold, read from /admin/video/visuals provider
health and the QA panel):
- Provider success rate at least 80% over the wave, no provider at 0%.
- Every video passed technical QA (P08) and frame QA; zero blocked-then-published.
- Median render time within the stage timings baseline (content.stageTimingsMs).
- No media upload failures and no partial social publishes.
- Storage within the Cloudinary free-tier headroom (see the cleanup dry-run).
- Owner reviewed at least 3 sample videos from the wave.

## Alert rules (proposed, delivered through the existing queue-alert webhook)

| Condition | Threshold |
| --- | --- |
| Repeated provider failure | 3 failures in a row for one provider |
| Quota exhaustion | provider error mentions quota/429 twice in 1 hour |
| Stale job | processing longer than staleAfterMinutes |
| Duplicate-content block | 2 in one day |
| Media upload failure | any |
| Partial social publish | any platform succeeded and another failed |

## Rollback

Every provider has an env flag (HF_*, COMFYUI_ENABLED, FREE_VIDEO_PROVIDER_ENABLED,
CLIP_LIBRARY). Turning a flag off takes effect on the next worker run; the
template renderer stays the fallback.

## Not decided here

Cost per video and bandwidth per video need Cloudinary usage data; the free
tier has no per-video bill, so track storage MiB per video instead.
