# مصفوفة صلاحيات واجهات Admin API — 15 نوفمبر 2026

هذه المصفوفة هي المرجع التنفيذي لصلاحيات معالجات HTTP في `src/app/api/admin`. يجب أن يتطابق كل مسار وطريقة HTTP مع الصلاحيات المدرجة حرفيًا. لا تكفي صلاحية عامة أو صلاحية أعلى غير لازمة بدلًا منها.

| الطريقة | المسار | الصلاحية الخادمية |
|---|---|---|
| GET | `/api/admin/analytics` | `analytics.read` |
| POST | `/api/admin/cloudinary/image` | `media.manage` |
| GET | `/api/admin/cloudinary/image` | رفض صريح 405 دون صلاحية أو أثر جانبي |
| GET | `/api/admin/content` | `content.manage` |
| GET | `/api/admin/media` | `media.manage` |
| POST | `/api/admin/media` | `media.manage` |
| PATCH | `/api/admin/media` | `media.manage` |
| GET | `/api/admin/overview` | `dashboard.view` |
| POST | `/api/admin/page-view` | `admin.access` — records the current admin route after removing query strings and fragments; it is write-only telemetry, not analytics data access |
| GET | `/api/admin/sections` | `sections.manage` |
| POST | `/api/admin/sections` | `sections.manage` |
| GET | `/api/admin/site-audio` | `audio.manage` |
| POST | `/api/admin/site-audio` | `audio.manage` |
| PATCH | `/api/admin/site-audio` | `audio.manage` |
| DELETE | `/api/admin/site-audio` | `audio.manage` |
| POST | `/api/admin/site-audio/upload` | `audio.manage` |
| GET | `/api/admin/social/facebook/callback` | `social.manage`, `social.publish` (MFA step-up) — validates OAuth state and stores the verified Page credential only; it never resumes queued posts |
| GET | `/api/admin/social/facebook/connect` | `social.manage` + `social.publish` MFA step-up — Page publishing + Insights permissions |
| GET | `/api/admin/social` | `social.manage` — queue and connection management |
| POST | `/api/admin/social` | `social.manage` + `social.publish` — step-up required for sensitive actions |
| GET | `/api/admin/social/written` | `social.manage` — written queue read; conditional `kids.manage` for Kids rows. Social-only managers receive only positively classified general posts; unknown legacy rows are hidden. |
| POST | `/api/admin/social/written` | `social.manage` + `social.publish` — MFA step-up before generation dispatch; `kids.manage` is conditional for explicit Kids or auto source selection |
| POST | `/api/admin/video-generation/narration-upload` | `video.manage` |
| GET | `/api/admin/video-clips` | `video.manage` |
| POST | `/api/admin/video-clips` | `video.manage` — MFA step-up; clip is created pending |
| PATCH | `/api/admin/video-clips` | `video.manage` — MFA step-up; approve or retire only |
| GET | `/api/admin/video-purge` | `video.delete` — dry-run preview only |
| POST | `/api/admin/video-purge` | `video.delete` — MFA step-up before destructive cleanup |
| GET | `/api/admin/video-generation` | `video.manage`; `kids.manage` for Kids rows |
| DELETE | `/api/admin/video-generation` | `video.delete` |
| PATCH | `/api/admin/video-generation` | `video.manage`; `kids.manage` for Kids approval only — external publish retry returns HTTP 410 |
| GET | `/api/admin/video-generation/prophet-candidates` | `video.manage` |
| GET | `/api/admin/video-generation/sources` | `video.manage`; `kids.manage` for Kids sources |
| GET | `/api/admin/social/youtube/connect` | `social.manage` + `social.publish` MFA step-up — publishing-capable OAuth |
| GET | `/api/admin/social/youtube/callback` | `social.manage`, `social.publish` (MFA step-up) — validates upload/read scopes and stores the publishing refresh token |
| GET | `/api/admin/video/templates` | `video.manage`; `kids.manage` for Kids templates/previews |
| POST | `/api/admin/video/templates` | `video.manage`, `kids.manage` (Kids templates only) |
| POST | `/api/admin/videos/[id]/retry` | `video.manage`; `kids.manage` for Kids audience only |
| GET | `/api/admin/videos/[id]` | `video.manage`; `kids.manage` for Kids audience |
| PATCH | `/api/admin/videos/[id]` | `video.manage`; `kids.manage` for Kids audience only |
| DELETE | `/api/admin/videos/[id]` | `video.delete`؛ و`kids.manage` إضافية لطلبات الأطفال |
| POST | `/api/admin/videos/[id]/project-copy` | `video.delete` MFA step-up؛ و`kids.manage` إضافية لطلبات الأطفال — حذف نسخة ZIKR فقط مع الحفاظ على المنشورات الخارجية |
| POST | `/api/admin/videos/create` | `video.manage`, `kids.manage` (Kids audience only) |
| GET | `/api/admin/videos` | `video.manage`; `kids.manage` for Kids rows |
| POST | `/api/admin/videos/upload` | `video.manage` |
| GET | `/api/admin/videos/upload` | رفض صريح 405 دون صلاحية أو أثر جانبي |
| POST | `/api/admin/youtube-facebook/register-media` | `media.manage` — retired, HTTP 410 |
| POST | `/api/admin/youtube-facebook/upload-url` | `media.manage` — retired, HTTP 410 |

## ثوابت إضافية

- استجابة GET `/api/admin/overview` لا تعيد إجماليات جداول متعددة المجالات أو طابور النشر الاجتماعي الخارجي المتقاعد؛ لا تُضمّن أعداد طابور توليد الفيديو إلا لمن يملك `video.manage`، بينما تظل صلاحية دخول المسار نفسها `dashboard.view`.

- مسارات OAuth الخاصة بـFacebook وYouTube ومسارات إدارة طابور النشر الاجتماعي فعّالة ومحمية بالصلاحيات المدرجة أعلاه؛ عمليات النشر/التوليد الحساسة تتطلب `social.publish` مع MFA step-up.
- بدء OAuth الخاص بـFacebook يتطلب `social.manage` و`social.publish` مع MFA step-up. Callback يتحقق من state ويحفظ اعتماد الصفحة فقط؛ لا يعيد فتح عناصر الطابور ولا يطلق النشر. اعتماد توكن الخادم يتحقق من التوكن ويحفظه فقط، ولا يستأنف الطابور. استئناف العناصر المحجوبة حصريًا عبر `release_auth_blocked_queue` داخل POST `/api/admin/social`، ويتطلب `social.publish` وMFA وتأكيدًا صريحًا والتحقق من اتصال الصفحة؛ ولا يعيد إلا العناصر التي تقع ضمن `SOCIAL_PUBLISH_AFTER`، وتظل العناصر التاريخية الأقدم محجوبة.
- مسارا استيراد الوسائط القديمان `/api/admin/youtube-facebook/register-media` و`/api/admin/youtube-facebook/upload-url` فقط يعيدان HTTP 410 بعد التحقق من `media.manage`.
- بدء OAuth الخاص بـYouTube يتطلب `social.manage` كحارس للمسار، ثم MFA step-up منفصلًا لصلاحية `social.publish` قبل طلب النطاقات `youtube.upload` و`youtube.readonly` و`yt-analytics.readonly`، مع رفض أي نطاق قادر على حذف الفيديوهات؛ Callback يتحقق من state والنطاقات ويخزن refresh token فقط ولا يطلق النشر. صلاحية النشر تظل منفصلة عن مجرد حفظ الاعتماد.
- إنشاء فيديو موجّه للأطفال عبر POST `/api/admin/videos/create` يتطلب `video.manage` مع MFA step-up و`kids.manage`؛ إنشاء الفيديو العام يظل تحت `video.manage` فقط.
- نشر الفيديو داخل موقع ZIKR يستخدم `content_publish_queue` و`video.manage`، ولا يحتاج صلاحيات النشر الاجتماعي.
- إعادة محاولة النشر الخارجي للفيديو متوقفة وتعيد HTTP 410.
- حذف طلب فيديو أو سجل فيديو يحتاج `video.delete`، وليس `video.manage` وحدها؛ وحذف طلب أطفال يحتاج `kids.manage` أيضًا من المدير نفسه.
- رفع الوسائط أو طلب رابط رفع يحتاج صلاحية مجال الوسائط أو الفيديو بحسب نوع الأصل.
- جميع عمليات التعديل والإرسال الحساسة تسجل Audit وفق عقود الخدمة؛ استثناءات القراءة و405 لا تنشئ أحداثًا وهمية.
- فاحص `scripts/verify-admin-api-guards.mjs` يتحقق من وجود الحارس قبل العمل المحمي، ويقارن قائمة الصلاحيات الفعلية بالمصفوفة أعلاه لكل معالج. أي مسار جديد يحتاج إضافة واعتماد سجل صريح قبل اجتياز Quality Gate.
- صلاحيات العناصر الظاهرة في التنقل لا تُعد بديلًا عن الحارس الخادمي، ولا تُمنح أي صلاحية بإخفاء/إظهار رابط فقط.

## نطاق الفحص

آخر جرد كامل ناجح على audit PR #320 عند commit الفحص 91c47855d22a20041fabcc20f7539f7f881a7aaa اكتشف 27 ملف API و43 معالج HTTP، منها معالجان GET يرفضان الطريقة صراحةً بـ405. كما اكتشف 14 وحدة Server Actions تضم 30 إجراءً محميًا. أصبح فاحص الصلاحيات يقارن صفوف هذه الوثيقة مباشرةً بالمصفوفة التنفيذية حتى لا تنحرف الوثيقة عن حراس المسارات. لا تتضمن هذه المصفوفة Server Actions؛ تظل خاضعة لفحص AST المنفصل في نفس الأداة.
