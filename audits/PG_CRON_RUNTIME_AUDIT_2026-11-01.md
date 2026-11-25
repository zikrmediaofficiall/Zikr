# Supabase pg_cron Runtime Audit — 2026-11-01

Project: `ymxdswkaxafakugktsim`
Observation: read-only query of `cron.job`; no jobs were created, changed, enabled, or disabled.

| Job ID | Job name | Schedule | Current target | Active |
|---:|---|---|---|---|
| 1 | `zikr-prayer-push-dispatch` | Every minute | `https://ymxdswkaxafakugktsim.supabase.co/functions/v1/prayer-notification-worker` | Yes |
| 3 | `zikr-source-verified-content-agent` | Daily at 03:00 | `https://ymxdswkaxafakugktsim.supabase.co/functions/v1/source-verified-content-agent` | Yes |
| 5 | `zikr-youtube-facebook-sync` | Every 10 minutes | `https://ymxdswkaxafakugktsim.supabase.co/functions/v1/sync-youtube-facebook` | **No** |
| 6 | `zikr-cron-history-cleanup` | Daily at 03:30 | Internal SQL job; no HTTP target | Yes |

## Findings

- Every active HTTP cron target points to the canonical production Supabase project.
- The retired `sync-youtube-facebook` job remains in `cron.job` for history/compatibility but is disabled.
- No old Supabase project URL is present in an active cron job.
- Historical migration files that contain former endpoints are immutable and must not be rewritten after application. Future changes require forward migrations.
- GitHub Actions owns production video generation and social publishing; Supabase cron does not call the retired social sync worker.

## Validation limits

This audit confirms cron job definitions and active flags only. It does not prove that each scheduled invocation succeeds at runtime. Invocation history, function logs, and provider responses must be checked separately.


## 2026-11-15 read-only runtime checkpoint

- Active cron entries observed: `zikr-prayer-push-dispatch` (every minute), `zikr-source-verified-content-agent` (daily 03:00), and `zikr-cron-history-cleanup` (daily 03:30). `zikr-youtube-facebook-sync` (every 10 minutes) remains inactive.
- Deployed Edge Function versions observed: prayer notification worker v77 and source-verified content agent v14; the YouTube/Facebook sync function is not active on the cron schedule.
- Migration history remains 418 applied versus 445 local (27 pending). No cron schedule, function deployment, secret or production database row was changed by this audit.
- GitHub scheduled workflows are separate from pg_cron. The scheduled social publisher, video generation, media metadata audit and offline snapshot refresh were inspected through their existing runs only; none was manually dispatched by this audit.