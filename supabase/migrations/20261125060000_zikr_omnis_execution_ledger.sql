BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_omnis_execution_ledger (
  task_key text PRIMARY KEY,
  phase_key text NOT NULL,
  phase_order integer NOT NULL CHECK (phase_order >= 0),
  task_order integer NOT NULL CHECK (task_order >= 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'in_progress', 'blocked', 'completed')),
  commit_sha text NULL CHECK (commit_sha IS NULL OR commit_sha ~ '^[0-9a-f]{40}$'),
  tests_summary text NULL,
  last_note text NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_key, task_order)
);

CREATE TABLE IF NOT EXISTS public.admin_omnis_execution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL REFERENCES public.admin_omnis_execution_ledger(task_key) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('state_changed', 'evidence_recorded')),
  previous_state text NULL,
  next_state text NOT NULL CHECK (next_state IN ('pending', 'in_progress', 'blocked', 'completed')),
  note text NULL,
  commit_sha text NULL CHECK (commit_sha IS NULL OR commit_sha ~ '^[0-9a-f]{40}$'),
  tests_summary text NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_omnis_ledger_phase_order_idx
  ON public.admin_omnis_execution_ledger (phase_order, task_order);
CREATE INDEX IF NOT EXISTS admin_omnis_ledger_state_idx
  ON public.admin_omnis_execution_ledger (state, updated_at DESC);
CREATE INDEX IF NOT EXISTS admin_omnis_events_task_created_idx
  ON public.admin_omnis_execution_events (task_key, created_at DESC);

ALTER TABLE public.admin_omnis_execution_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_omnis_execution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_omnis_ledger_admin_read ON public.admin_omnis_execution_ledger;
CREATE POLICY admin_omnis_ledger_admin_read
  ON public.admin_omnis_execution_ledger
  FOR SELECT TO authenticated
  USING ((SELECT private.has_admin_role(ARRAY['admin', 'super_admin']::text[])));

DROP POLICY IF EXISTS admin_omnis_events_admin_read ON public.admin_omnis_execution_events;
CREATE POLICY admin_omnis_events_admin_read
  ON public.admin_omnis_execution_events
  FOR SELECT TO authenticated
  USING ((SELECT private.has_admin_role(ARRAY['admin', 'super_admin']::text[])));

REVOKE ALL ON public.admin_omnis_execution_ledger FROM anon, authenticated;
GRANT SELECT ON public.admin_omnis_execution_ledger TO authenticated;
GRANT ALL ON public.admin_omnis_execution_ledger TO service_role;
REVOKE ALL ON public.admin_omnis_execution_events FROM anon, authenticated;
GRANT SELECT ON public.admin_omnis_execution_events TO authenticated;
GRANT ALL ON public.admin_omnis_execution_events TO service_role;

CREATE OR REPLACE FUNCTION public.transition_admin_omnis_task(
  p_task_key text,
  p_next_state text,
  p_actor_id uuid,
  p_note text DEFAULT NULL,
  p_commit_sha text DEFAULT NULL,
  p_tests_summary text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_task public.admin_omnis_execution_ledger%ROWTYPE;
  v_sha text := lower(trim(COALESCE(p_commit_sha, '')));
  v_summary text := trim(COALESCE(p_tests_summary, ''));
  v_note text := NULLIF(trim(COALESCE(p_note, '')), '');
BEGIN
  IF COALESCE(trim(p_task_key), '') = '' OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'A task key and authenticated actor are required' USING ERRCODE = '22023';
  END IF;

  IF p_next_state NOT IN ('pending', 'in_progress', 'blocked', 'completed') THEN
    RAISE EXCEPTION 'Unsupported execution state' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_task
  FROM public.admin_omnis_execution_ledger
  WHERE task_key = p_task_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown OMNIS task key: %', p_task_key USING ERRCODE = 'P0002';
  END IF;

  -- Repeating the same transition is an idempotent no-op; it never creates duplicate history.
  IF v_task.state = p_next_state THEN
    RETURN to_jsonb(v_task);
  END IF;

  IF p_next_state = 'completed' THEN
    IF v_sha !~ '^[0-9a-f]{40}$' THEN
      RAISE EXCEPTION 'Completion requires a valid 40-character commit SHA' USING ERRCODE = '22023';
    END IF;
    IF length(v_summary) < 10 THEN
      RAISE EXCEPTION 'Completion requires a meaningful test and verification summary' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_next_state = 'blocked' AND length(COALESCE(v_note, '')) < 5 THEN
    RAISE EXCEPTION 'Blocked tasks require a reason' USING ERRCODE = '22023';
  END IF;

  UPDATE public.admin_omnis_execution_ledger
  SET state = p_next_state,
      commit_sha = CASE WHEN p_next_state = 'completed' THEN v_sha ELSE commit_sha END,
      tests_summary = CASE WHEN p_next_state = 'completed' THEN v_summary ELSE tests_summary END,
      last_note = COALESCE(v_note, last_note),
      started_at = CASE WHEN p_next_state = 'in_progress' THEN COALESCE(started_at, now()) ELSE started_at END,
      completed_at = CASE WHEN p_next_state = 'completed' THEN now() ELSE NULL END,
      updated_by = p_actor_id,
      updated_at = now(),
      evidence = CASE
        WHEN p_next_state = 'completed'
          THEN evidence || jsonb_build_object('completionCommit', v_sha, 'verificationSummary', v_summary)
        ELSE evidence
      END
  WHERE task_key = p_task_key
  RETURNING * INTO v_task;

  INSERT INTO public.admin_omnis_execution_events (
    task_key, event_type, previous_state, next_state, note, commit_sha, tests_summary, actor_user_id
  )
  VALUES (
    p_task_key, 'state_changed', (SELECT state FROM public.admin_omnis_execution_ledger WHERE task_key = p_task_key AND false),
    p_next_state, v_note, CASE WHEN p_next_state = 'completed' THEN v_sha ELSE NULL END,
    CASE WHEN p_next_state = 'completed' THEN v_summary ELSE NULL END, p_actor_id
  );

  RETURN to_jsonb(v_task);
END;
$function$;

REVOKE ALL ON FUNCTION public.transition_admin_omnis_task(text, text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_admin_omnis_task(text, text, uuid, text, text, text)
  TO service_role;

COMMENT ON TABLE public.admin_omnis_execution_ledger IS
  'Authoritative idempotent execution ledger for the ZIKR OMNIS control-plane rollout.';
COMMENT ON TABLE public.admin_omnis_execution_events IS
  'Append-only transition history for ZIKR OMNIS execution tasks.';
COMMENT ON FUNCTION public.transition_admin_omnis_task(text, text, uuid, text, text, text) IS
  'Server-only, row-locked, idempotent transition for OMNIS execution tasks; completion requires a commit SHA and verification summary.';

INSERT INTO public.admin_omnis_execution_ledger (
  task_key, phase_key, phase_order, task_order, title, description, state,
  commit_sha, tests_summary, last_note, started_at, completed_at
)
VALUES
('OMNIS-P00-01', 'P00', 0, 0, 'تثبيت خط أساس المشروع', 'جرد GitHub وSupabase وVercel ومسارات الإدارة والصلاحيات والتكاملات الحالية.', 'completed', '4282a74576d316f60e495f8f178279cab21c34fc', 'Baseline audit completed: GitHub repository, 117 admin paths, 175 API paths, 93 public tables, Supabase advisors, and Vercel production state inspected.', NULL, now(), now()),
('OMNIS-P00-02', 'P00', 0, 1, 'إنشاء سجل تنفيذ مانع للتكرار', 'تأسيس سجل موحد للمراحل والمهام والأحداث مع مفاتيح ثابتة وانتقالات حالات آمنة.', 'in_progress', NULL, NULL, 'Execution ledger and idempotent migration are being established on this branch.', now(), NULL),
('OMNIS-P00-03', 'P00', 0, 2, 'اعتماد عقد الحوكمة والملكية', 'تحديد مالك كل وحدة ومصدر الحقيقة وصلاحيات كل عملية وبوابات قبولها.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P01-01', 'P01', 1, 0, 'توحيد واجهات الخدمات', 'تعريف عقود قراءة وكتابة وتنفيذ موحدة مع صلاحيات خادمية.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P01-02', 'P01', 1, 1, 'توحيد حالة الوحدات', 'توحيد نموذج الحالة والتوافر والاعتماديات وتاريخ الفحص.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P01-03', 'P01', 1, 2, 'ربط سجل التدقيق', 'تسجيل كل تغيير إداري وربطه بالمستخدم والمورد والنتيجة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P02-01', 'P02', 2, 0, 'جرد إعدادات المشروع', 'حصر إعدادات الموقع والتطبيق والمحتوى والذكاء الاصطناعي والنشر والبنية.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P02-02', 'P02', 2, 1, 'تعريف أنواع الإعدادات والتحقق', 'بناء Registry typed للقيم الافتراضية والنطاق والمالك والاعتماديات والتحقق.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P02-03', 'P02', 2, 2, 'إدارة النسخ والتطبيق والتراجع', 'تسجيل نسخ الإعدادات وتطبيقها عبر الخدمة المالكة مع معاينة واستعادة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P03-01', 'P03', 3, 0, 'لوحة الحالة التشغيلية', 'عرض صحة الخدمات والطوابير والتكاملات والنشر بحالات موثقة المصدر.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P03-02', 'P03', 3, 1, 'التنبيهات والحوادث', 'توحيد درجات الخطورة والتنبيهات والحوادث ومسؤول المعالجة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P03-03', 'P03', 3, 2, 'الأوامر السريعة الآمنة', 'إتاحة أوامر تشغيل وإيقاف وفحص مع تحقق صلاحية واعتماد وسجل.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P04-01', 'P04', 4, 0, 'فهرسة موارد المشروع', 'فهرسة الصفحات والمكونات والخدمات والجداول وواجهات API والـ workflows.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P04-02', 'P04', 4, 1, 'خريطة الاعتماديات', 'ربط الموارد وإظهار التأثير المتسلسل لأي تغيير.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P04-03', 'P04', 4, 2, 'تحليل التأثير قبل التعديل', 'منع التغييرات غير محددة النطاق وإظهار الموارد والاختبارات المتأثرة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P05-01', 'P05', 5, 0, 'إدارة تجربة الموقع', 'إدارة الصفحات والأقسام والقوائم والثيمات والظهور والمعاينة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P05-02', 'P05', 5, 1, 'منشئ الصفحات والمكونات', 'إنشاء مكونات وصفحات قابلة لإعادة الاستخدام مع نسخ ومعاينة واختبارات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P05-03', 'P05', 5, 2, 'إدارة تطبيق Android', 'إدارة الإعدادات والإصدارات والتوقيع والروابط والإشعارات وفحوص الجاهزية.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P06-01', 'P06', 6, 0, 'توحيد إدارة المحتوى', 'إدارة أنواع المحتوى والتصنيفات والمصادر والترجمات والنسخ والجدولة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P06-02', 'P06', 6, 1, 'التحقق والتوثيق', 'قواعد تحقق مرجعية للنصوص القرآنية والأحاديث والمصادر والمراجعات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P06-03', 'P06', 6, 2, 'حوكمة التحرير والنشر', 'مراحل مراجعة واعتماد ونشر وتراجع مع سجل تاريخي.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P07-01', 'P07', 7, 0, 'إدارة النماذج والمزودين', 'إدارة المزود والنموذج والتوجيه والبدائل والحدود والميزانيات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P07-02', 'P07', 7, 1, 'مصنع الفيديو والصوت', 'توحيد السكريبت والمشاهد والأصوات والرندر والقوالب والوسائط.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P07-03', 'P07', 7, 2, 'بوابة الجودة والأصول', 'تطبيق اختبارات المحتوى والوسائط والتصنيف والحقوق قبل التسليم للنشر.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P08-01', 'P08', 8, 0, 'توحيد الحسابات والقنوات', 'إدارة OAuth والصلاحيات وحالة الاتصال لكل حساب ومنصة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P08-02', 'P08', 8, 1, 'إدارة الجدولة والطوابير', 'جدولة مستقلة لكل قناة مع منع التكرار وإعادة المحاولة والعزل.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P08-03', 'P08', 8, 2, 'التتبع والتحقق بعد النشر', 'تسجيل معرف المنشور ورابطه ونتيجة التسليم ومؤشرات المزامنة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P09-01', 'P09', 9, 0, 'طبقة بيانات التحليلات', 'توحيد المقاييس والمصادر والفترات واكتمال البيانات وتاريخ تحديثها.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P09-02', 'P09', 9, 1, 'تحليلات الجمهور والمحتوى', 'تقارير الموقع والتطبيق والمحتوى والمنصات والجمهور بصورة تحترم الخصوصية.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P09-03', 'P09', 9, 2, 'النمو والربح وSEO', 'لوحات الحملات والإيرادات الفعلية والتقديرية والظهور والفهرسة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P10-01', 'P10', 10, 0, 'مصمم تدفقات العمل', 'بناء Triggers وConditions وActions وVerification من واجهة مرئية.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P10-02', 'P10', 10, 1, 'موثوقية التنفيذ', 'تطبيق Idempotency وRetries وTimeouts وRate Limits وDead Letter.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P10-03', 'P10', 10, 2, 'اعتمادات وإيقاف واستعادة', 'تطبيق Dry Run وموافقة بشرية وKill Switch ومسارات تعافٍ.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P11-01', 'P11', 11, 0, 'مركز الخدمات السحابية', 'مراقبة Vercel وSupabase وGitHub وCI والتخزين والتكاملات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P11-02', 'P11', 11, 1, 'استوديو قاعدة البيانات وAPI', 'جرد الجداول والترحيلات وRLS والفهارس والواجهات والـ webhooks.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P11-03', 'P11', 11, 2, 'مركز تطوير الكود', 'إدارة الفروع والـ commits وPRs والمراجعات والاختبارات والاعتماديات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P12-01', 'P12', 12, 0, 'صلاحيات دقيقة وفصل الواجبات', 'تطبيق RBAC/ABAC حسب الدور والمورد والعملية والبيئة والنطاق.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P12-02', 'P12', 12, 1, 'مراقبة الأمان والأسرار', 'فحص الأسرار والثغرات والجلسات وMFA وسجلات التدقيق دون كشف الأسرار.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P12-03', 'P12', 12, 2, 'النسخ الاحتياطي والتعافي', 'سياسات نسخ واستعادة مجربة وخطط حوادث وتراجع.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P13-01', 'P13', 13, 0, 'تأسيس وكلاء متخصصين', 'تحديد وكلاء النظام والكود والبيانات والأمان والمحتوى والإنتاج والنمو.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P13-02', 'P13', 13, 1, 'ربط الأدوات وسياق الموارد', 'تقييد مصادر البيانات والأدوات والصلاحيات والميزانية لكل وكيل.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P13-03', 'P13', 13, 2, 'تنسيق التحليل والإصلاح', 'تعاون الوكلاء في تشخيص المشكلات وإعداد تغييرات قابلة للمراجعة.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P14-01', 'P14', 14, 0, 'اختبارات العقود والتكامل', 'اختبارات Unit وIntegration وE2E وRLS والصلاحيات وسيناريوهات الفشل.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P14-02', 'P14', 14, 1, 'اختبار التحمل والاستعادة', 'قياس الأداء والطوابير والتعافي والتراجع وحماية البيانات.', 'pending', NULL, NULL, NULL, NULL, NULL),
('OMNIS-P14-03', 'P14', 14, 2, 'إطلاق تدريجي وإغلاق موثق', 'Preview ثم Staging ثم إنتاج بعد موافقات بوابات الإصدار وإغلاق الفجوات.', 'pending', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (task_key) DO NOTHING;

COMMIT;
