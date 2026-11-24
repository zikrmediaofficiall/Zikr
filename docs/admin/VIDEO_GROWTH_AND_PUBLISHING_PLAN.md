# ZIKR — Video Growth & Publishing Plan

Prepared: 25 November 2026  
Operating timezone: Africa/Cairo  
Scope: automated short-form video, YouTube Shorts, Facebook Reels and Facebook Page feed.

## Production baseline

A read-only review of the connected production database and available public YouTube insights found:

- 305 video-generation requests recorded; 97 completed in the latest seven-day window.
- The stored automation target was 20 videos/day with an internal ceiling of 24, while the latest seven-day generation average was about 14/day.
- The recent YouTube insight sample showed the strongest response for Quran (49 sampled posts, about 139 average views and 8.3 average likes) and Dua (40 sampled posts, about 103 average views and 2.4 average likes).
- Hadith and Adhkar were lower in the same sample (about 38 and 37 average views); verified stories were about 26; general-message videos were about 3 views and 0.1 average likes.
- 304 of 305 completed generation records in the latest 30-day provider sample carried the deterministic fallback provider marker. Many provider failures contained a Gradio response-shape error, so increasing generation volume before fixing provider reliability would multiply fallback output.
- ZIKR currently has connected YouTube and Facebook publishing credentials. The automated video adapters support YouTube, Facebook Reels and horizontal Facebook Page video. TikTok and Instagram are not wired into the current OAuth/publishing path.

These numbers are directional and limited by the available metrics. The insight table contains public views, likes and comments; it does not provide retention, average view duration, CTR or complete private audience analytics.

## Initial 14-day operating policy

### Volume

- Generate a target of 3 short videos per Cairo day. The weekly “دقيقتين مع ليل” episode remains a separate editorial asset and outside the short-video quota.
- Publish at most 3 short videos/day on each connected short-form platform. One approved vertical master is cross-published to YouTube Shorts and Facebook Reels: 3 YouTube uploads plus 3 Reels per day, not 6 separately generated videos.
- Publish one separate written Facebook Page post/day. It does not consume the video quota.
- Do not publish immediately when rendering finishes. Queue each video to the next Cairo slot, with at least 15 minutes of lead time.
- Keep the admin Run Now batch bounded at 3 by default. Do not use repeated urgent runs to evade the daily cap.

### Cairo posting slots

| Slot | Cairo time | Editorial role |
|---|---:|---|
| 1 | 05:37 | Early morning: Quran or Dua |
| 2 | 14:22 | Afternoon: Quran or Dua |
| 3 | 17:52 | Evening: Hadith, Adhkar, verified story or Kids rotation |

The allocator reserves a slot independently for every target platform, checks queued/partial/processing/published video rows and fails closed if no slot is available. It uses the IANA timezone Africa/Cairo, not a fixed UTC offset. The publisher now re-slots due/null video backlog using a compare-and-set update before claiming work; if that reconciliation fails, it does not claim more queue rows. Reassess the slots after 14 days using actual platform insights; these times are a controlled starting experiment, not a universal best-time claim.

### Weighted 14-video content cycle

The generator uses a deterministic 14-video cycle informed by the current YouTube category sample:

| Type | Videos per 14 | Share |
|---|---:|---:|
| Quran | 4 | 28.6% |
| Dua | 3 | 21.4% |
| Hadith | 2 | 14.3% |
| Kids | 2 | 14.3% |
| Adhkar | 1 | 7.1% |
| Verified stories | 1 | 7.1% |
| General messages | 1 | 7.1% |

At 3/day this produces a rolling 42-video mix over 14 days. Category selection is stable across retries. Kids remains in its separate child-audience path with age-appropriate metadata and child-safety QA; it is never used to fill a general-audience gap.

## Platform limits and safeguards

### YouTube

- Use vertical 9:16 masters for Shorts. Most short-form items should land around 18–40 seconds, but the renderer must respect actual narration duration rather than cut speech to fit an arbitrary selector.
- The default YouTube Data API allocation includes a dedicated 100-call/day bucket for videos.insert uploads, with each insert costing 1 quota unit; other Data API methods share a 10,000-unit/day pool. This is an API quota, not a recommended publishing cadence. The actual project quota can differ and must be checked in Google Cloud Console.
- ZIKR's initial internal cap is deliberately much lower: 3 Shorts/day. Verify the remote upload ID before counting a platform delivery as published.

Official references:
- https://developers.google.com/youtube/v3/determine_quota_cost
- https://developers.google.com/youtube/v3/docs/videos/insert

### Facebook

- Use Facebook Reels for vertical short-form outputs and the Page feed for the separate written post.
- Keep Reels to the same conservative 3/day internal cadence. The existing 12-minute minimum interval between Reel attempts plus provider cooldown remains a safety guard, not a claim that Meta has a universal 3/day or 12-minute posting limit.
- Meta Page API usage is dynamic and depends on Business Use Case usage. Monitor provider usage headers and back off when throttling is signaled. Do not translate an API-call formula into a guessed number of permitted posts.

Official reference:
- https://developers.facebook.com/docs/graph-api/overview/rate-limiting/

Do not add Instagram/TikTok targets until OAuth credentials, scopes, account eligibility, media rules and platform-specific delivery adapters are implemented and tested.

## Video quality and generator roadmap

1. **Fix provider output parsing.** Gradio can return nested FileData, Video and result objects. The worker now recursively finds a same-origin file URL/path rather than assuming the first tuple item is the video. Existing HTTPS, same-origin, MP4, size and redirect protections remain in place.
2. **Keep sacred text source-locked.** Quran, Hadith, Dua, Adhkar and verified stories remain bound to published project sources. Never rewrite a sacred source text to manufacture a stronger hook.
3. **Vary the first three seconds.** Studio offers balanced, question, reflection and action opening styles. This affects the on-screen hook and social caption, not the religious source text.
4. **Preserve quality gates.** Keep Arabic narration QA, natural pacing, audible audio, H.264/AAC, 1080×1920 vertical output, readable Arabic captions, source attribution, safe-area layout, child-safety checks and the QA snapshot bound to the exact rendered media.
5. **Reduce generic filler.** Restrict general motivational messages to a small share. Each must be an original, non-attributed script with one practical idea and clear disclosure; it must never imitate a religious quotation.
6. **Improve visuals without default spend increases.** Prefer validated free providers when available; retain deterministic FFmpeg rendering as a reliable fallback. Record provider, failure reason, render time, media bytes and QA outcome. Do not label fallback footage as AI-generated footage.
7. **Build repeatable series.** Examples: “آية ومعنى”، “دعاء في موقفه”، “حديث وتطبيق”، “ذكر ووقته”، “قصة موثقة في دقيقة”، and “سؤال للأطفال”. Preserve brand identity while varying hooks, scenes, motion, pacing and examples.
8. **Keep Kids separate.** Require explicit Kids audience, age group, learning objective, complete series metadata and child-safety QA. Never weaken those conditions to fill the daily target.
9. **Keep one canonical master.** Cloudinary remains the durable playback master. Do not delete it after social upload. Remove only redundant staging copies after verified delivery and reference checks.

## Measurement and iteration

Review at 7 and 14 days. Track, per platform and category:

- Views at 24 hours and 7 days.
- Likes, comments, shares and saves where the provider exposes them.
- Subscribers/followers gained in the reporting window.
- Engagement rate = (likes + comments + shares) / views, only when all fields exist.
- Publishing success, partial delivery, cooldowns and OAuth failures.
- Render fallback rate, render time, file size and failed QA reasons.

Do not optimize solely for raw views. Source accuracy, child safety, platform health and meaningful engagement remain release gates.

Decision rule: after at least 14 days and a useful sample per category, shift one daily slot toward categories with materially higher seven-day median views and meaningful engagement. Do not increase volume until the 3/day cadence is consistently published without backlog or provider warnings.
