# ZIKR — free-tier budget and paid-alternative review

**Date:** 28 November 2026
**Scope:** every service in the Zikr project (repo `zikrmediaofficiall/Zikr`, live site `zikrmediaofficial.vercel.app`) that is paid or has a free limit.
**Method:** read the repo (`package.json`, `.env.example`, `next.config.ts`, `vercel.json`, the video provider docs, the OMNIS configuration inventory), then checked each limit on the vendor's own page on 28 November 2026.

---

## الخلاصة بالعربي

المشروع **لا يدفع أي اشتراك حاليًا**، وكل ما يعمل عليه يعتمد على خطط مجانية، وفيه بالفعل سياسة مكتوبة باسم «ممنوع المزود المدفوع» (`VIDEO_FREE_ONLY=true`). يعني المطلوب مش «إلغاء اشتراكات»، المطلوب **ضبط استهلاك الخطط المجانية** حتى لا نصل لحد يوقف الموقع.

أهم النقاط:

1. **قاعدة بيانات Supabase (500 ميجا)** هي الخطر الأول. النصوص الكبيرة (القرآن والتفاسير والأحاديث) هي اللي بتستهلكها. الحل المجاني: النص الثابت الكبير يخرج من قاعدة البيانات إلى الملف الثابت (offline bundle) الموجود أصلًا في المشروع ويُقدَّم من الشبكة.
2. **تخزين Supabase (1 جيجا)** و**نقل بيانات Vercel (100 جيجا/شهر)** هما الخطر الثاني، والسبب الصوت والصور. البديل المجاني الجاهز: **Cloudflare R2** (10 جيجا تخزين وبدون أي تكلفة خروج بيانات).
3. **Flow**: 1080p و4K مدفوعين، لكن 720p مجاني وتحميله مجاني. عملت سكربت **upscale محلي بـFFmpeg** يحوّل الـ720p لـ1080p أو 4K بتكلفة صفر، فمش محتاجين نشتري ترقية أبدًا.
4. **Hugging Face**: الاستخدام مجاني، وPRO (9$) بيزود الحصة 8 أضعاف وده مش محتاجينه. ضفنا سقف داخلي 6 تشغيلات يوميًا والقالب المحلي بديل دائم.
5. **GitHub Actions**: المستودع خاص، فالحصة 2000 دقيقة/شهر. المجاني غير محدود لو المستودع بقى عام، والقرار ده ليك لأنه بيكشف الكود.
6. **المدفوع الحقيقي اللي ملوش بديل مجاني مضمون**: دومين مخصص (~10 دولار/سنة) لـAdSense، ورسوم متاجر التطبيقات (Google Play 25$ مرة واحدة، Apple 99$/سنة). البديل: تفضل PWA على الموبايل بدل المتاجر.
7. عملت **سجل موحّد لكل خطة مجانية** (26 خدمة) بحدها ومصدرها وسقفنا الداخلي والبديل، وأداة تحسب النسبة وتنبّه عند 80%، وصفحة إدارة تعرض الاستهلاك مقابل الحد. الأرقام اللي مش مقدر أقراها من غير تسجيل دخول مكتوبة «needs login» ومش مخترعة.

---

## 1. What the project pays for today

**Nothing.** There is no paid subscription in the repo: no Stripe, no paid CDN, no paid analytics, no paid AI SDK. Production runs with `VIDEO_FREE_ONLY=true`, which the router enforces: public Hugging Face Spaces and the local FFmpeg template renderer only, and Gemini is not injected.

Two things cost money but are not running: a custom domain (for AdSense) and app-store accounts (for native distribution). Both are decisions, not subscriptions.

## 2. Every limited free plan, its limit, and the free fix

| # | Item | Free limit (vendor page) | Usage now | Free fix / alternative | Status |
|---|---|---|---|---|---|
| 1 | Supabase database | 500 MB per project; project pauses after 1 week idle; 2 active projects ([pricing](https://supabase.com/pricing)) | **needs login** (dashboard) | Move large immutable text (Quran, tafsir, hadith bodies) to the static offline bundle the repo already ships and serve it from the CDN; keep Postgres for rows that change | Registry + fallback documented; needs his dashboard number |
| 2 | Supabase storage | 1 GB ([pricing](https://supabase.com/pricing)) | **needs login** | Cloudflare R2 free (10 GB) for bulk audio and images; Supabase Storage for small authenticated files only | Escape hatch documented |
| 3 | Supabase egress | 5 GB/month ([pricing](https://supabase.com/pricing)) | **needs login** | Serve media from R2 (zero egress) and cache API responses | Documented |
| 4 | Supabase edge functions | 500,000 invocations/month | **needs login** | Prayer scheduler can move to a GitHub Actions cron if it climbs; self cap set at 350k | Self cap in registry |
| 5 | Supabase auth | 50,000 MAU/month | **needs login** | No action at this scale | Documented |
| 6 | Vercel | Hobby: 100 GB fast data transfer, 1M CDN requests, 1M function invocations per month; 100 deployments/day; 45 min build; 100 MB static upload ([limits](https://vercel.com/docs/limits), [pricing](https://vercel.com/docs/pricing/legacy-pricing)) | **needs login** | Media to R2 cuts the bandwidth line; self cap 60 deployments/day; keep the 4.5 MB adhan file out of the build | Caps in registry |
| 7 | Cloudinary | 25 credits/month shared across storage, transformations and bandwidth ([pricing](https://cloudinary.com/pricing)) | **needs login** | Next/Image already resizes on demand, so transformations can go to zero; bulk files to R2 | Documented |
| 8 | Hugging Face ZeroGPU | Free for all users; PRO ($9/mo) adds 8x quota and priority ([docs](https://huggingface.co/docs/hub/spaces-zerogpu)) | Free tier, capped by us at 6 runs/day | Keep the existing order (LTX, WAN, template) with per-day cap and backoff; template renderer needs no quota | Cap in registry, router already falls back |
| 9 | Google Flow | Free 50 credits/day; one 8s 720p clip = 10 credits; 720p download free, 1080p/4K are paid upgrades (observed 28 Nov 2026) | 47 → 37 credits for one clip | **Local upscale with FFmpeg** (`scripts/upscale-video.mjs`) instead of buying the 1080p/4K download | **Implemented and tested** |
| 10 | GitHub Actions | Public repos unlimited; private repo on GitHub Free 2,000 minutes/month ([billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-actions)) | **needs login** | Fewer cron runs, per-run caps, cancel superseded runs; heavy video job on his own machine; or make the repo public (his call) | Self cap 1,500 min |
| 11 | Resend | 3,000 emails/month, 100/day ([pricing](https://resend.com/pricing)) | **needs login** | Admin alerts only; in-app queue alerts already exist | Self cap 20/day |
| 12 | YouTube Data API | 10,000 units/day; `videos.insert` has its own 100/day bucket ([quota](https://developers.google.com/youtube/v3/determine_quota_cost)) | **needs login** | Cached channel feed already serves pages when quota runs out; publishing capped at 50 uploads/day | Caps in registry |
| 13 | Gemini API | Free tier with per-day request caps ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)) | Must be 0 (free-only mode) | Template renderer and static content; the site works without any AI call | Guard limit = 0 |
| 14 | Nominatim (public OSM) | Max 1 request/second, no bulk geocoding ([policy](https://operations.osmfoundation.org/policies/nominatim/)) | Policy test already in the repo | Cache geocoding results; self-host if volume grows | Rate in registry |
| 15 | Cloudflare R2 (not in use yet) | 10 GB storage, 1M Class A, 10M Class B per month, **egress free** ([pricing](https://developers.cloudflare.com/r2/pricing/)) | 0 | The escape hatch for items 2, 3 and 6 | Planned |
| 16 | Cloudflare Pages (alternative host) | 500 builds/month, 20,000 files, static assets free ([limits](https://developers.cloudflare.com/pages/platform/limits/)) | 0 | Only if Vercel's limits ever bite; a Next app needs an adapter, so this is a last resort, not a drop-in | Alternative only |

Not a free tier and not replaceable by one: a custom domain (AdSense), Google Play ($25 once), Apple Developer ($99/year). See section 5.

## 3. How each allowance is spent (the budget rules)

The rules live in `config/free-tier-budget.json` under `rules`, so code and docs read the same numbers.

- **Video:** 5 videos/day (`VIDEO_DAILY_LIMIT`), at most 6 Hugging Face runs and 4 Flow clips (40 of the 50 free credits) per day. Provider order stays `hf_ltx_fast → hf_wan → template`.
- **Quota backoff:** a quota or 429 error retires that provider for the rest of the local day and the router falls through. The template renderer is the floor and needs no quota at all.
- **Resolution:** render at 720p, then upscale locally when a platform wants 1080p. Never buy Flow's 1080p/4K download.
- **Publishing:** at most 50 YouTube uploads/day, leaving headroom under the 100/day `videos.insert` bucket and keeping 2,000 quota units for channel reads.
- **Email:** at most 20 Resend emails/day for admin alerts.
- **Alerts:** 80% is a warning, 100% is critical. The same thresholds drive the CLI exit code and the admin page.

## 4. What was implemented

All additive; no existing file was modified, so nothing can regress from this change alone.

| File | What it does |
|---|---|
| `config/free-tier-budget.json` | The registry: 26 services with limit, window, self cap, reset note, fallback and source URL |
| `scripts/free-tier-budget.mjs` | Loads and validates the registry, compares it to a usage file, prints table/markdown/JSON, exits 2 with `--fail-on warn|critical`; exports `assertWithinBudget()` for a pipeline to call before spending |
| `scripts/tests/free-tier-budget.test.mjs` | 12 tests: registry validity and source URLs, duplicate ids, cap above limit, 80/100% boundaries, unknown-is-not-zero, zero-limit guard, report rendering, guard behaviour |
| `scripts/upscale-video.mjs` | Free local 720p → 1080p/1440p/2160p upscale: Lanczos, luma unsharp, audio stream-copied when possible, faststart, refuses to overwrite the source, verifies the output with ffprobe |
| `scripts/tests/upscale-video.test.mjs` | 5 tests including a real clip: generate 720p, upscale to 1080p, assert 1920x1080, audio present, duration preserved, source untouched, second run is a no-op |
| `src/features/ops/free-tier-budget.ts` | Typed view of the same registry plus the state arithmetic (no second copy of any limit) |
| `src/app/admin/free-tier/page.tsx` | Admin page: usage vs limit per service, 80%/100% banner, progress bars, fallback and source link per row, and the budget rules. Reads `free_tier_usage` from admin settings; a service with no number shows "not recorded" |

**No migration is needed.** Usage is a JSON value in the existing admin settings store (`free_tier_usage`), not a new table. If it ever needs history, that is a separate, deliberate migration.

### Verified locally

```
node --test scripts/tests/free-tier-budget.test.mjs scripts/tests/upscale-video.test.mjs
# tests 17  pass 17  fail 0

node scripts/upscale-video.mjs --input 720p.mp4 --output 1080p.mp4 --target 1080 --json
# action upscaled, 1920x1080, audio aac kept, 2.00s preserved, cost 0
# same input at --target 2160 -> 3840x2160
# re-running on the 1080p output -> action skip, no file written
```

The TypeScript module typechecks under `--strict` with no errors. The admin page has no syntax errors but was **not** built by Next here (no repo checkout, no `node_modules`), so it must pass CI before it lands.

## 5. The genuinely paid items and their honest options

| Item | Cost | Free option | Reality |
|---|---|---|---|
| Custom domain for AdSense | ~$10–15/year | Free subdomains (e.g. an `is-a.dev`-style service, or `eu.org`) | AdSense expects a site you can verify and own ([eligibility](https://support.google.com/adsense/answer/9724)). A `*.vercel.app` address is not his domain and gives no DNS control, so approval is unreliable. A free subdomain with DNS control is a gamble, not a fix. Recommendation: buy the cheapest real domain (often $2–10 the first year) when he actually wants ads; ads before traffic earn nothing anyway |
| Google Play | $25 once | Stay a PWA | The Capacitor app already works as a PWA. Play listing is only worth it when he wants store discovery |
| Apple Developer | $99/year | Stay a PWA | Same reasoning; the iOS build exists but distribution is the paid part |
| Flow 1080p/4K | per-clip upgrade | **Local FFmpeg upscale** | Implemented. Upscaling adds pixels, not detail; for a clay/claymation look at 720p source this is visually fine on a phone screen, but it is not a native 1080p render |
| Supabase Pro | $25/month | Trim the database, move media to R2, keep-alive | Only needed if the 500 MB or 1 GB limits are actually hit. Get the number from the dashboard first |
| Hugging Face PRO | $9/month | Free quota + template fallback | Not needed; the project already survives quota exhaustion |

## 6. What still needs a login or a decision

**Needs a dashboard login (I did not guess these):** Supabase database size, storage used, egress, edge invocations, MAU; Vercel bandwidth and function usage; Cloudinary credits used; GitHub Actions minutes used this month; Resend volume; YouTube quota consumption.

**Needs his decision:** whether to make the repo public (removes the Actions minute limit, exposes the code); whether to buy a domain; whether to publish to the stores; whether to adopt Cloudflare R2 (free, but a new account and a storage adapter).

## 7. Suggested order if a limit is actually hit

1. **Database near 500 MB** → move tafsir/hadith text to the static bundle, keep Postgres for the rest. Zero cost, no vendor change.
2. **Storage or bandwidth near the limit** → Cloudflare R2, then point media URLs at it. Zero cost, one adapter.
3. **Vercel function or request limits** → cache public routes harder before considering another host.
4. **Actions minutes** → cut cron frequency and batch size first; his own machine for heavy renders second; public repo last.
5. **Only if all of that is exhausted** does a paid tier become the cheaper option — and at that point it is a business decision with a number attached, not a default.
