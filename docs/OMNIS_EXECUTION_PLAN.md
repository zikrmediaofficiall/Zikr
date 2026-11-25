# ZIKR OMNIS — Unified Platform Operating System

> **Execution branch:** `feat/zikr-omnis-control-plane-20261125`  
> **Baseline commit:** `4282a74576d316f60e495f8f178279cab21c34fc`  
> **Plan version:** 1  
> **Architecture scope:** 30 control centers · 15 phases · 45 tracked work items

## Purpose

OMNIS evolves the existing ZIKR administration surface into one governed operating system for the website, Android app, content, knowledge verification, AI providers, media production, social distribution, analytics, revenue, users, infrastructure, development, and release operations. It extends the current admin architecture; it does not replace existing pages or bypass existing production release gates.

## Source of truth and no-repeat protocol

1. This document and `docs/OMNIS_EXECUTION_LEDGER.json` define the immutable scope and stable work-item keys.
2. `public.admin_omnis_execution_ledger` in the connected Supabase project is the authoritative current execution state.
3. `public.admin_omnis_execution_events` is append-only transition history.
4. Every work item has one stable key (`OMNIS-Pxx-yy`). The database primary key and `ON CONFLICT (task_key) DO NOTHING` prevent duplicate insertion.
5. Resume work by selecting the earliest item not marked `completed` ordered by `phase_order, task_order`. Never recreate a key or silently reset completed work.
6. A completion requires a real 40-character commit SHA and a meaningful test/verification summary. A design note or an untested UI is not completion evidence.
7. Repeating a transition to the same state is a no-op. Real state changes are row-locked and recorded in the event history and admin audit.
8. If a task is reopened, preserve its past event and add a new transition; do not delete history.
9. A deployed Preview does not imply Production completion. Production requires the existing protected release process and post-deployment checks.

## Existing platform baseline

- GitHub: `zikrmediaofficiall/Zikr`, default branch `main`.
- Baseline: `4282a74576d316f60e495f8f178279cab21c34fc`.
- Supabase: project `Zikrofficial` / ref `zqtssvlvmkzeeyqghqfk`.
- Vercel: project `zikr` / id `prj_aruq5Q3gsE8DhgV86iIvz2WrVzEj`.
- Existing admin navigation has ten canonical zones and established permission gates.
- Supabase baseline has 93 public tables with RLS enabled. Existing security advisor findings are tracked separately; OMNIS does not weaken them.
- Production deployments remain gated; branch Preview validation precedes any production release.

## 30 control centers

| # | Center | Existing state at baseline |
|---:|---|---|
| 1 | القيادة والتحكم الشامل (`Executive Command`) | قائم |
| 2 | مستكشف المشروع (`Project Explorer`) | مخطط |
| 3 | التحكم الموحد (`Universal Control`) | جزئي |
| 4 | استوديو الإعدادات (`Configuration Studio`) | جزئي |
| 5 | استوديو تجربة الموقع (`Website Experience`) | جزئي |
| 6 | منشئ الصفحات والمكونات (`Page & Component Builder`) | مخطط |
| 7 | مركز التطبيق (`Mobile Application`) | جزئي |
| 8 | تحليل رحلة المستخدم (`Journey Analytics`) | جزئي |
| 9 | نظام المحتوى (`Universal Content OS`) | قائم |
| 10 | التحقق المعرفي (`Knowledge Verification`) | جزئي |
| 11 | مركز نماذج الذكاء الاصطناعي (`AI Model Center`) | مخطط |
| 12 | مصنع الإنتاج المرئي (`Video Production OS`) | قائم |
| 13 | إدارة الأصول (`Media & Assets`) | قائم |
| 14 | الصوت والراديو (`Audio & Voice`) | قائم |
| 15 | النشر متعدد القنوات (`Omnichannel Publishing`) | قائم |
| 16 | محرك النمو والحملات (`Growth & Campaigns`) | جزئي |
| 17 | ذكاء الجمهور (`Audience Intelligence`) | جزئي |
| 18 | محرك SEO والبحث (`SEO & Search`) | قائم |
| 19 | ذكاء الأعمال والتحليلات (`Business Intelligence`) | قائم |
| 20 | إدارة الإيرادات (`Revenue & Monetization`) | جزئي |
| 21 | الهوية والصلاحيات (`Identity & Access`) | قائم |
| 22 | المجتمع والإشراف (`Community & Moderation`) | مخطط |
| 23 | الإشعارات والرسائل (`Notifications`) | قائم |
| 24 | منظومة تعلم الأطفال (`Kids Learning`) | قائم |
| 25 | البنية السحابية (`Cloud Infrastructure`) | جزئي |
| 26 | استوديو قاعدة البيانات (`Database Studio`) | جزئي |
| 27 | استوديو التكاملات وAPI (`API & Integrations`) | جزئي |
| 28 | مركز التطوير البرمجي (`Software Development`) | جزئي |
| 29 | الإصدارات والنشر التقني (`Release & Deployment`) | قائم |
| 30 | الأمن والنسخ والتعافي (`Security & Recovery`) | جزئي |

The registry in `src/features/admin/omnis/registry.ts` is the machine-readable source for the control-center overview. `active` means an existing operational entry point is present, not that every OMNIS capability listed for that center is complete. `partial` means only part of the desired integration exists. `planned` means the dedicated center is not implemented yet.

## Execution phases

### P00 — الجرد والحوكمة وسجل التنفيذ

- [x] `OMNIS-P00-01` — **تثبيت خط أساس المشروع:** جرد GitHub وSupabase وVercel ومسارات الإدارة والصلاحيات والتكاملات الحالية.
- [x] `OMNIS-P00-02` — **إنشاء سجل تنفيذ مانع للتكرار:** تأسيس سجل موحد للمراحل والمهام والأحداث مع مفاتيح ثابتة وانتقالات حالات آمنة.
- [x] `OMNIS-P00-03` — **اعتماد عقد الحوكمة والملكية:** تحديد مالك كل وحدة ومصدر الحقيقة وصلاحيات كل عملية وبوابات قبولها.

### P01 — طبقة التحكم المركزية Control Plane

- [x] `OMNIS-P01-01` — **توحيد واجهات الخدمات:** تعريف عقود قراءة وكتابة وتنفيذ موحدة مع صلاحيات خادمية.
- [x] `OMNIS-P01-02` — **توحيد حالة الوحدات:** توحيد نموذج الحالة والتوافر والاعتماديات وتاريخ الفحص.
- [ ] `OMNIS-P01-03` — **ربط سجل التدقيق:** تسجيل كل تغيير إداري وربطه بالمستخدم والمورد والنتيجة.

### P02 — سجل الإعدادات المركزي Configuration Registry

- [ ] `OMNIS-P02-01` — **جرد إعدادات المشروع:** حصر إعدادات الموقع والتطبيق والمحتوى والذكاء الاصطناعي والنشر والبنية.
- [ ] `OMNIS-P02-02` — **تعريف أنواع الإعدادات والتحقق:** بناء Registry typed للقيم الافتراضية والنطاق والمالك والاعتماديات والتحقق.
- [ ] `OMNIS-P02-03` — **إدارة النسخ والتطبيق والتراجع:** تسجيل نسخ الإعدادات وتطبيقها عبر الخدمة المالكة مع معاينة واستعادة.

### P03 — مركز القيادة والتحكم Global Command Center

- [ ] `OMNIS-P03-01` — **لوحة الحالة التشغيلية:** عرض صحة الخدمات والطوابير والتكاملات والنشر بحالات موثقة المصدر.
- [ ] `OMNIS-P03-02` — **التنبيهات والحوادث:** توحيد درجات الخطورة والتنبيهات والحوادث ومسؤول المعالجة.
- [ ] `OMNIS-P03-03` — **الأوامر السريعة الآمنة:** إتاحة أوامر تشغيل وإيقاف وفحص مع تحقق صلاحية واعتماد وسجل.

### P04 — مستكشف المشروع وخريطة الاعتماديات

- [ ] `OMNIS-P04-01` — **فهرسة موارد المشروع:** فهرسة الصفحات والمكونات والخدمات والجداول وواجهات API والـ workflows.
- [ ] `OMNIS-P04-02` — **خريطة الاعتماديات:** ربط الموارد وإظهار التأثير المتسلسل لأي تغيير.
- [ ] `OMNIS-P04-03` — **تحليل التأثير قبل التعديل:** منع التغييرات غير محددة النطاق وإظهار الموارد والاختبارات المتأثرة.

### P05 — استوديو الموقع والتطبيق

- [ ] `OMNIS-P05-01` — **إدارة تجربة الموقع:** إدارة الصفحات والأقسام والقوائم والثيمات والظهور والمعاينة.
- [ ] `OMNIS-P05-02` — **منشئ الصفحات والمكونات:** إنشاء مكونات وصفحات قابلة لإعادة الاستخدام مع نسخ ومعاينة واختبارات.
- [ ] `OMNIS-P05-03` — **إدارة تطبيق Android:** إدارة الإعدادات والإصدارات والتوقيع والروابط والإشعارات وفحوص الجاهزية.

### P06 — نظام المحتوى والمعرفة الإسلامية

- [ ] `OMNIS-P06-01` — **توحيد إدارة المحتوى:** إدارة أنواع المحتوى والتصنيفات والمصادر والترجمات والنسخ والجدولة.
- [ ] `OMNIS-P06-02` — **التحقق والتوثيق:** قواعد تحقق مرجعية للنصوص القرآنية والأحاديث والمصادر والمراجعات.
- [ ] `OMNIS-P06-03` — **حوكمة التحرير والنشر:** مراحل مراجعة واعتماد ونشر وتراجع مع سجل تاريخي.

### P07 — مركز الذكاء الاصطناعي والإنتاج

- [ ] `OMNIS-P07-01` — **إدارة النماذج والمزودين:** إدارة المزود والنموذج والتوجيه والبدائل والحدود والميزانيات.
- [ ] `OMNIS-P07-02` — **مصنع الفيديو والصوت:** توحيد السكريبت والمشاهد والأصوات والرندر والقوالب والوسائط.
- [ ] `OMNIS-P07-03` — **بوابة الجودة والأصول:** تطبيق اختبارات المحتوى والوسائط والتصنيف والحقوق قبل التسليم للنشر.

### P08 — النشر متعدد القنوات

- [ ] `OMNIS-P08-01` — **توحيد الحسابات والقنوات:** إدارة OAuth والصلاحيات وحالة الاتصال لكل حساب ومنصة.
- [ ] `OMNIS-P08-02` — **إدارة الجدولة والطوابير:** جدولة مستقلة لكل قناة مع منع التكرار وإعادة المحاولة والعزل.
- [ ] `OMNIS-P08-03` — **التتبع والتحقق بعد النشر:** تسجيل معرف المنشور ورابطه ونتيجة التسليم ومؤشرات المزامنة.

### P09 — التحليلات والنمو والإيرادات

- [ ] `OMNIS-P09-01` — **طبقة بيانات التحليلات:** توحيد المقاييس والمصادر والفترات واكتمال البيانات وتاريخ تحديثها.
- [ ] `OMNIS-P09-02` — **تحليلات الجمهور والمحتوى:** تقارير الموقع والتطبيق والمحتوى والمنصات والجمهور بصورة تحترم الخصوصية.
- [ ] `OMNIS-P09-03` — **النمو والربح وSEO:** لوحات الحملات والإيرادات الفعلية والتقديرية والظهور والفهرسة.

### P10 — محرك الأتمتة الشامل

- [ ] `OMNIS-P10-01` — **مصمم تدفقات العمل:** بناء Triggers وConditions وActions وVerification من واجهة مرئية.
- [ ] `OMNIS-P10-02` — **موثوقية التنفيذ:** تطبيق Idempotency وRetries وTimeouts وRate Limits وDead Letter.
- [ ] `OMNIS-P10-03` — **اعتمادات وإيقاف واستعادة:** تطبيق Dry Run وموافقة بشرية وKill Switch ومسارات تعافٍ.

### P11 — البنية التحتية والتطوير وDevOps

- [ ] `OMNIS-P11-01` — **مركز الخدمات السحابية:** مراقبة Vercel وSupabase وGitHub وCI والتخزين والتكاملات.
- [ ] `OMNIS-P11-02` — **استوديو قاعدة البيانات وAPI:** جرد الجداول والترحيلات وRLS والفهارس والواجهات والـ webhooks.
- [ ] `OMNIS-P11-03` — **مركز تطوير الكود:** إدارة الفروع والـ commits وPRs والمراجعات والاختبارات والاعتماديات.

### P12 — الأمن والحوكمة والاستمرارية

- [ ] `OMNIS-P12-01` — **صلاحيات دقيقة وفصل الواجبات:** تطبيق RBAC/ABAC حسب الدور والمورد والعملية والبيئة والنطاق.
- [ ] `OMNIS-P12-02` — **مراقبة الأمان والأسرار:** فحص الأسرار والثغرات والجلسات وMFA وسجلات التدقيق دون كشف الأسرار.
- [ ] `OMNIS-P12-03` — **النسخ الاحتياطي والتعافي:** سياسات نسخ واستعادة مجربة وخطط حوادث وتراجع.

### P13 — مساعد OMNIS الذكي

- [ ] `OMNIS-P13-01` — **تأسيس وكلاء متخصصين:** تحديد وكلاء النظام والكود والبيانات والأمان والمحتوى والإنتاج والنمو.
- [ ] `OMNIS-P13-02` — **ربط الأدوات وسياق الموارد:** تقييد مصادر البيانات والأدوات والصلاحيات والميزانية لكل وكيل.
- [ ] `OMNIS-P13-03` — **تنسيق التحليل والإصلاح:** تعاون الوكلاء في تشخيص المشكلات وإعداد تغييرات قابلة للمراجعة.

### P14 — التحقق الشامل والتدرج للإنتاج

- [ ] `OMNIS-P14-01` — **اختبارات العقود والتكامل:** اختبارات Unit وIntegration وE2E وRLS والصلاحيات وسيناريوهات الفشل.
- [ ] `OMNIS-P14-02` — **اختبار التحمل والاستعادة:** قياس الأداء والطوابير والتعافي والتراجع وحماية البيانات.
- [ ] `OMNIS-P14-03` — **إطلاق تدريجي وإغلاق موثق:** Preview ثم Staging ثم إنتاج بعد موافقات بوابات الإصدار وإغلاق الفجوات.

## Architecture and delivery rules

- Keep Next.js, Supabase, GitHub Actions/CircleCI, and Vercel as the current platform foundations.
- All browser access remains publishable-key-only and RLS-protected. Service-role operations stay server-side.
- New public-schema tables must enable RLS, grant only necessary privileges, and include policies scoped to actual admin roles.
- Authorization must be checked on the server action/API and, where applicable, in RLS. Hiding a link is not authorization.
- Use typed, validated settings; never expose raw secrets or allow arbitrary SQL/JavaScript from the admin UI.
- Build on feature branches. Use Preview for functional tests; preserve production's protected deployment gate.
- Database DDL must be additive, reversible where practical, and accompanied by migration/contract tests. Do not run destructive schema or storage operations as part of the control plane rollout.
- External integrations must display verified connectivity, permissions, and freshness separately. A saved token or connected OAuth account is not proof of successful publishing.
- Analytics must expose source, period, last refresh, and missing-data state. Unknown is not zero.
- Public social videos remain general-audience by default; child suitability is a separate content attribute and does not automatically make an entire public channel child-directed.

## Acceptance gates

A phase can only be marked complete when:
1. Its code and database changes (if any) are committed.
2. Its targeted unit/contract tests pass.
3. RLS and server-side authorization have been verified for data-affecting changes.
4. A Preview build is ready and critical routes have been smoke-tested.
5. The execution ledger contains the commit SHA and verification summary.
6. Admin audit and execution event history contain the state transition.

The overall project can only be marked complete after all 45 items are completed, full verification is green, Preview E2E tests pass, database advisors are reviewed, and a protected Production release passes post-deploy smoke tests.

## Change log

- 2026-11-25: Established OMNIS plan scope, stable task keys, baseline audit, and execution-ledger design on `feat/zikr-omnis-control-plane-20261125`.
- 2026-11-25: Completed `OMNIS-P01-02` on `48764a26acdbe9b6dd1163e449773d870104a192` after GitHub Quality Gate, all 32 PostgreSQL 17 checks, CircleCI, Android Debug, and Vercel Preview passed; authenticated browser E2E remains pending.
- 2026-11-25: Started `OMNIS-P01-03` to connect control-plane decisions and transitions to the canonical immutable admin audit stream.
