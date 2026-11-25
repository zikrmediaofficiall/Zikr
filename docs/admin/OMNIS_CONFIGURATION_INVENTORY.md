# OMNIS Configuration Inventory

**Task:** `OMNIS-P02-01` — project configuration inventory  
**Branch:** `feat/zikr-omnis-control-plane-20261125`  
**Inventory policy:** names, source files, scope, owner and dependency domains only. Secret values, tokens, credentials, private URLs and environment values are intentionally excluded.

## Environment-variable inventory

The canonical variable-name source is `.env.example`. This list is generated from assignment keys only; values are never copied into this document.

| Variable | Runtime scope | Owning domain | Source |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public build/runtime | Platform | `.env.example` |
| `NEXT_PUBLIC_VERCEL_ENV` | Public build/runtime | Platform | `.env.example` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public build/runtime | Platform / Supabase | `.env.example` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public build/runtime | Platform / Supabase | `.env.example` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/worker | Platform / Supabase | `.env.example` |
| `SUPABASE_PUBLIC_KEY` | Server/worker | Platform / Supabase | `.env.example` |
| `SUPABASE_URL` | Server/worker | Platform / Supabase | `.env.example` |
| `SUPABASE_ANON_KEY` | Server/worker | Platform / Supabase | `.env.example` |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Public build/runtime | Identity & Access | `.env.example` |
| `AUTH_CALLBACK_URL` | Server/worker | Identity & Access | `.env.example` |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Public build/runtime | Identity & Access | `.env.example` |
| `YOUTUBE_API_KEY` | Server/worker | Social & Integrations | `.env.example` |
| `YOUTUBE_CHANNEL_ID` | Server/worker | Social & Integrations | `.env.example` |
| `YOUTUBE_CLIENT_ID` | Server/worker | Social & Integrations | `.env.example` |
| `YOUTUBE_CLIENT_SECRET` | Server/worker | Social & Integrations | `.env.example` |
| `YOUTUBE_UPLOAD_PRIVACY` | Server/worker | Social & Integrations | `.env.example` |
| `FACEBOOK_APP_ID` | Server/worker | Social & Integrations | `.env.example` |
| `FACEBOOK_APP_SECRET` | Server/worker | Social & Integrations | `.env.example` |
| `FACEBOOK_PAGE_ID` | Server/worker | Social & Integrations | `.env.example` |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Server/worker | Social & Integrations | `.env.example` |
| `SOCIAL_PUBLISH_FACEBOOK_ENABLED` | Server/worker | Social & Integrations | `.env.example` |
| `SOCIAL_PUBLISH_YOUTUBE_ENABLED` | Server/worker | Social & Integrations | `.env.example` |
| `FACEBOOK_GRAPH_API_VERSION` | Server/worker | Social & Integrations | `.env.example` |
| `SOCIAL_BACKGROUND_BATCH_SIZE` | Server/worker | Video Operations | `.env.example` |
| `SOCIAL_PUBLISH_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `SOCIAL_KIDS_CATALOG_RECONCILIATION_AFTER` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_FREE_ONLY` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_PROVIDER_ORDER` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_AI_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_BASE_URL` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_TIMEOUT_MS` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_MODEL` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_WAN_WORKFLOW_JSON` | Server/worker | Video Operations | `.env.example` |
| `COMFYUI_LTX_WORKFLOW_JSON` | Server/worker | Video Operations | `.env.example` |
| `FREE_VIDEO_PROVIDER_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `FREE_VIDEO_PROVIDER_URL` | Server/worker | Video Operations | `.env.example` |
| `FREE_VIDEO_PROVIDER_ALLOWED_HOSTS` | Server/worker | Video Operations | `.env.example` |
| `FREE_VIDEO_PROVIDER_TOKEN` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_DAILY_LIMIT` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_MAX_RETRIES` | Server/worker | Video Operations | `.env.example` |
| `SOCIAL_MAX_RETRIES` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_STALE_AFTER_MINUTES` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_DEFAULT_FORMAT` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_DEFAULT_DURATION` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_TIMEZONE` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_AUTOMATION_DRY_RUN` | Server/worker | Video Operations | `.env.example` |
| `DAILY_VIDEO_TARGET` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_BATCH_SIZE` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_SECONDS` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_AI_ATTEMPTS_PER_RUN` | Server/worker | Video Operations | `.env.example` |
| `HF_WAN_VIDEO_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `HF_LTX_FAST_VIDEO_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `HF_WAN_SPACE` | Server/worker | Video Operations | `.env.example` |
| `HF_LTX_FAST_SPACE` | Server/worker | Video Operations | `.env.example` |
| `HF_VIDEO_CUSTOM_SPACES` | Server/worker | Video Operations | `.env.example` |
| `HF_VIDEO_PYTHON` | Server/worker | Video Operations | `.env.example` |
| `HF_TOKEN` | Server/worker | Video Operations | `.env.example` |
| `VERIFY_VIDEO_RUNTIME_TOOLS` | Server/worker | Video Operations | `.env.example` |
| `BACKGROUND_JOB_TARGET` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_TEMPLATE_VERSION` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_OUTPUT_CRF` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_AUDIO_BITRATE` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_PUBLISH_ENABLED` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_PUBLISH_REQUIRES_APPROVAL` | Server/worker | Video Operations | `.env.example` |
| `INTERNAL_JOB_SECRET` | Server/worker | Video Operations | `.env.example` |
| `GEMINI_API_KEY` | Server/worker | AI & Content | `.env.example` |
| `WRITTEN_CONTENT_ENABLED` | Server/worker | AI & Content | `.env.example` |
| `WRITTEN_CONTENT_ALLOW_KIDS` | Server/worker | AI & Content | `.env.example` |
| `WRITTEN_CONTENT_DAILY_TARGET` | Server/worker | AI & Content | `.env.example` |
| `WRITTEN_CONTENT_BATCH_SIZE` | Server/worker | AI & Content | `.env.example` |
| `WRITTEN_CONTENT_CATEGORY` | Server/worker | AI & Content | `.env.example` |
| `GEMINI_MODEL` | Server/worker | AI & Content | `.env.example` |
| `GEMINI_FALLBACK_MODEL` | Server/worker | AI & Content | `.env.example` |
| `AI_GATEWAY_API_KEY` | Server/worker | AI & Content | `.env.example` |
| `CLOUDINARY_CLOUD_NAME` | Server/worker | Media Operations | `.env.example` |
| `CLOUDINARY_API_KEY` | Server/worker | Media Operations | `.env.example` |
| `CLOUDINARY_API_SECRET` | Server/worker | Media Operations | `.env.example` |
| `ANDROID_APP_LINKS_SHA256` | Server/worker | Media Operations | `.env.example` |
| `IOS_ASSOCIATED_DOMAIN_APP_ID` | Server/worker | Media Operations | `.env.example` |
| `HADITH_API_BASE_URL` | Server/worker | Content & Knowledge | `.env.example` |
| `NOMINATIM_BASE_URL` | Server/worker | Content & Knowledge | `.env.example` |
| `QURAN_AYAH_AUDIO_BASE_URL` | Server/worker | Content & Knowledge | `.env.example` |
| `QURAN_VIDEO_RECITER_CODE` | Server/worker | Content & Knowledge | `.env.example` |
| `QURAN_AYAH_AUDIO_RECITER_CODE` | Server/worker | Content & Knowledge | `.env.example` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public build/runtime | Growth & Analytics | `.env.example` |
| `NEXT_PUBLIC_GTM_ID` | Public build/runtime | Growth & Analytics | `.env.example` |
| `GOOGLE_CLIENT_ID` | Server/worker | Growth & Analytics | `.env.example` |
| `GOOGLE_CLIENT_SECRET` | Server/worker | Growth & Analytics | `.env.example` |
| `GA4_REFRESH_TOKEN` | Server/worker | Growth & Analytics | `.env.example` |
| `GA4_PROPERTY_ID` | Server/worker | Growth & Analytics | `.env.example` |
| `NEXT_PUBLIC_ADSENSE_ENABLED` | Public build/runtime | Growth & Analytics | `.env.example` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Public build/runtime | Growth & Analytics | `.env.example` |
| `NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT` | Public build/runtime | Growth & Analytics | `.env.example` |
| `NEXT_PUBLIC_KIDS_ANALYTICS_ENABLED` | Public build/runtime | Kids Experience | `.env.example` |
| `KIDS_CONTENT_SHAREABLE` | Server/worker | Kids Experience | `.env.example` |
| `KIDS_FACEBOOK_SHARE_ENABLED` | Server/worker | Kids Experience | `.env.example` |
| `KIDS_YOUTUBE_INTEGRATION_ENABLED` | Server/worker | Kids Experience | `.env.example` |
| `NEXT_PUBLIC_KIDS_CONTENT_SHAREABLE` | Public build/runtime | Kids Experience | `.env.example` |
| `NEXT_PUBLIC_KIDS_SHARE_MESSAGE` | Public build/runtime | Kids Experience | `.env.example` |
| `PUSH_CONTACT` | Server/worker | Platform / Supabase | `.env.example` |
| `ARABIC_TTS_PYTHON` | Server/worker | Video Operations | `.env.example` |
| `ARABIC_TTS_VENV` | Server/worker | Video Operations | `.env.example` |
| `ARABIC_TTS_VOICE` | Server/worker | Video Operations | `.env.example` |
| `ARABIC_TTS_RATE` | Server/worker | Video Operations | `.env.example` |
| `ARABIC_TTS_PITCH` | Server/worker | Video Operations | `.env.example` |
| `ARABIC_TTS_PROFILE` | Server/worker | Video Operations | `.env.example` |
| `HADITH_TRANSLATION_BATCH_SIZE` | Server/worker | Video Operations | `.env.example` |
| `TRANSLATION_BATCH_SIZE` | Server/worker | Video Operations | `.env.example` |
| `DEPLOYMENT_URL` | Server/worker | Video Operations | `.env.example` |
| `MOBILE_RELEASE_CHANNEL` | Server/worker | Video Operations | `.env.example` |
| `MOBILE_RELEASE_PLATFORM` | Server/worker | Video Operations | `.env.example` |
| `MOBILE_RELEASE_CHECK` | Server/worker | Video Operations | `.env.example` |
| `AUTO_VIDEO_URGENT` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_WORKER_BATCH_SIZE` | Server/worker | Video Operations | `.env.example` |
| `VIDEO_WORKER_CONCURRENCY` | Server/worker | Video Operations | `.env.example` |
| `HF_VIDEO_PROVIDER_TIMEOUT_MS` | Server/worker | Video Operations | `.env.example` |
| `WEBHOOK_SECRET` | Server/worker | Social & Integrations | `.env.example` |
| `ADMIN_QUEUE_ALERT_WEBHOOK_URL` | Server/worker | Social & Integrations | `.env.example` |
| `ADMIN_QUEUE_ALERT_WEBHOOK_SECRET` | Server/worker | Social & Integrations | `.env.example` |
| `ADMIN_QUEUE_ALERT_EMAIL_TO` | Server/worker | Social & Integrations | `.env.example` |
| `ADMIN_QUEUE_ALERT_EMAIL_FROM` | Server/worker | Social & Integrations | `.env.example` |
| `RESEND_API_KEY` | Server/worker | Social & Integrations | `.env.example` |

## Application and infrastructure configuration sources

| Domain | Canonical source | Ownership / responsibility | Dependencies |
|---|---|---|---|
| Web runtime and public origin | `src/lib/env.ts`, `.env.example`, `next.config.ts` | Platform engineering | Next.js, Vercel, Supabase Auth |
| Web deployment | `vercel.json`, Vercel project settings | Release engineering | GitHub branch, Vercel project, build environment |
| Mobile application identity and navigation | `capacitor.config.json`, `android/`, `mobile/` | Mobile engineering | Capacitor, Android Gradle, canonical web origin |
| Supabase project/auth/storage/functions | `supabase/config.toml`, `supabase/migrations/` | Platform / data engineering | Supabase Auth, Postgres, Storage, Edge Functions |
| Admin module ownership and permissions | `src/features/admin/config/modules.ts`, `src/features/admin/config/navigation.ts` | Admin platform / security | Admin roles, route registry, source tables |
| Content and editorial defaults | `src/features/`, `src/lib/`, `content/` | Content operations | Quran/Hadith sources, editorial catalog, localization |
| AI and generation defaults | `.env.example`, `src/features/videos/`, `src/lib/env.ts` | AI / video operations | Gemini, Hugging Face Spaces, FFmpeg, worker queues |
| Social publishing | `.env.example`, `src/features/social/`, Supabase OAuth credential tables | Social operations | Meta Graph API, YouTube Data API, OAuth scopes, Supabase |
| Analytics and monetization | `.env.example`, `src/features/analytics/`, `src/features/admin/` | Growth / analytics | GA4, Search Console, AdSense publisher configuration |
| Background schedules and workers | `.github/workflows/`, `.circleci/config.yml`, `supabase/migrations/`, `src/app/api/` | Platform / operations | GitHub Actions, CircleCI, Supabase Cron, worker secrets |
| Build and quality gates | `package.json`, `.github/workflows/quality-gate.yml`, `.circleci/config.yml` | Engineering productivity | pnpm, Node 22, Deno, PostgreSQL 17, Android SDK |
| SEO and canonical identity | `src/lib/site.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `supabase/config.toml` | SEO / platform | Canonical public origin, Search Console, sitemap |
| Security and privacy | `src/features/admin/services/permissions.ts`, `supabase/migrations/`, `scripts/verify-security-hardening.mjs` | Security engineering | Supabase RLS, server-only secrets, admin audit |

## Ownership and environment boundaries

- **Public build/runtime:** only explicitly public identifiers and feature flags may use the `NEXT_PUBLIC_` prefix. Never place credentials, access tokens, private endpoints or secrets in public variables.
- **Server/worker:** credentials remain server-side and are consumed only by the owning service or worker. A documented variable does not imply that a provider is connected or healthy.
- **Environments:** local development, Preview/CI and Production are separate configuration scopes. Production canonical URL and Supabase Auth redirect rules are governed by `docs/CANONICAL_AUTH_CONFIG.md`; Preview aliases must not be copied into Production auth allow-lists.
- **Provider credentials:** social OAuth credentials stored in Supabase remain the preferred connection source where documented; legacy environment fallbacks remain explicitly gated.
- **Source precedence:** application code and its validation scripts determine runtime behavior; `.env.example` documents deployable variable names; provider dashboards own external OAuth/app settings; Supabase migrations/config own database/auth/storage contracts; Vercel owns deployment-scoped variables.
- **Unknown is not configured:** presence of a variable name in this inventory does not prove that a value exists, is valid, has sufficient scopes, or that an integration works.

## Known configuration drift / follow-up

1. `docs/environment-variables.md` is a human-readable contract and must be reconciled against the canonical variable list as the registry is typed in P02-02.
2. Runtime consumers and aliases must be mapped explicitly before any variable is renamed or removed.
3. Provider-side settings that cannot be read safely from repository files remain marked as externally owned; this inventory does not attempt to retrieve their values.
4. P02-02 will convert this inventory into typed metadata, validation rules, ownership and dependency contracts. P02-03 will handle versioning/apply/rollback; this task does not mutate live settings.

## Verification

Run `pnpm omnis:config-inventory:check`. The check ensures every key in `.env.example` is represented here and rejects accidental value assignments in this inventory.
