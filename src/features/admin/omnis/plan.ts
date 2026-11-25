export type OmnisTaskState = "pending" | "in_progress" | "blocked" | "completed";

export type OmnisPlanTask = {
  taskKey: string;
  title: string;
  description: string;
  taskOrder: number;
};

export type OmnisPlanPhase = {
  phaseKey: string;
  phaseOrder: number;
  title: string;
  tasks: readonly OmnisPlanTask[];
};

export const OMNIS_EXECUTION_PHASES: readonly OmnisPlanPhase[] = [
  {
    phaseKey: "P00",
    phaseOrder: 0,
    title: "الجرد والحوكمة وسجل التنفيذ",
    tasks: [
      { taskKey: "OMNIS-P00-01", title: "تثبيت خط أساس المشروع", description: "جرد GitHub وSupabase وVercel ومسارات الإدارة والصلاحيات والتكاملات الحالية.", taskOrder: 0 },
      { taskKey: "OMNIS-P00-02", title: "إنشاء سجل تنفيذ مانع للتكرار", description: "تأسيس سجل موحد للمراحل والمهام والأحداث مع مفاتيح ثابتة وانتقالات حالات آمنة.", taskOrder: 1 },
      { taskKey: "OMNIS-P00-03", title: "اعتماد عقد الحوكمة والملكية", description: "تحديد مالك كل وحدة ومصدر الحقيقة وصلاحيات كل عملية وبوابات قبولها.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P01",
    phaseOrder: 1,
    title: "طبقة التحكم المركزية Control Plane",
    tasks: [
      { taskKey: "OMNIS-P01-01", title: "توحيد واجهات الخدمات", description: "تعريف عقود قراءة وكتابة وتنفيذ موحدة مع صلاحيات خادمية.", taskOrder: 0 },
      { taskKey: "OMNIS-P01-02", title: "توحيد حالة الوحدات", description: "توحيد نموذج الحالة والتوافر والاعتماديات وتاريخ الفحص.", taskOrder: 1 },
      { taskKey: "OMNIS-P01-03", title: "ربط سجل التدقيق", description: "تسجيل كل تغيير إداري وربطه بالمستخدم والمورد والنتيجة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P02",
    phaseOrder: 2,
    title: "سجل الإعدادات المركزي Configuration Registry",
    tasks: [
      { taskKey: "OMNIS-P02-01", title: "جرد إعدادات المشروع", description: "حصر إعدادات الموقع والتطبيق والمحتوى والذكاء الاصطناعي والنشر والبنية.", taskOrder: 0 },
      { taskKey: "OMNIS-P02-02", title: "تعريف أنواع الإعدادات والتحقق", description: "بناء Registry typed للقيم الافتراضية والنطاق والمالك والاعتماديات والتحقق.", taskOrder: 1 },
      { taskKey: "OMNIS-P02-03", title: "إدارة النسخ والتطبيق والتراجع", description: "تسجيل نسخ الإعدادات وتطبيقها عبر الخدمة المالكة مع معاينة واستعادة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P03",
    phaseOrder: 3,
    title: "مركز القيادة والتحكم Global Command Center",
    tasks: [
      { taskKey: "OMNIS-P03-01", title: "لوحة الحالة التشغيلية", description: "عرض صحة الخدمات والطوابير والتكاملات والنشر بحالات موثقة المصدر.", taskOrder: 0 },
      { taskKey: "OMNIS-P03-02", title: "التنبيهات والحوادث", description: "توحيد درجات الخطورة والتنبيهات والحوادث ومسؤول المعالجة.", taskOrder: 1 },
      { taskKey: "OMNIS-P03-03", title: "الأوامر السريعة الآمنة", description: "إتاحة أوامر تشغيل وإيقاف وفحص مع تحقق صلاحية واعتماد وسجل.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P04",
    phaseOrder: 4,
    title: "مستكشف المشروع وخريطة الاعتماديات",
    tasks: [
      { taskKey: "OMNIS-P04-01", title: "فهرسة موارد المشروع", description: "فهرسة الصفحات والمكونات والخدمات والجداول وواجهات API والـ workflows.", taskOrder: 0 },
      { taskKey: "OMNIS-P04-02", title: "خريطة الاعتماديات", description: "ربط الموارد وإظهار التأثير المتسلسل لأي تغيير.", taskOrder: 1 },
      { taskKey: "OMNIS-P04-03", title: "تحليل التأثير قبل التعديل", description: "منع التغييرات غير محددة النطاق وإظهار الموارد والاختبارات المتأثرة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P05",
    phaseOrder: 5,
    title: "استوديو الموقع والتطبيق",
    tasks: [
      { taskKey: "OMNIS-P05-01", title: "إدارة تجربة الموقع", description: "إدارة الصفحات والأقسام والقوائم والثيمات والظهور والمعاينة.", taskOrder: 0 },
      { taskKey: "OMNIS-P05-02", title: "منشئ الصفحات والمكونات", description: "إنشاء مكونات وصفحات قابلة لإعادة الاستخدام مع نسخ ومعاينة واختبارات.", taskOrder: 1 },
      { taskKey: "OMNIS-P05-03", title: "إدارة تطبيق Android", description: "إدارة الإعدادات والإصدارات والتوقيع والروابط والإشعارات وفحوص الجاهزية.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P06",
    phaseOrder: 6,
    title: "نظام المحتوى والمعرفة الإسلامية",
    tasks: [
      { taskKey: "OMNIS-P06-01", title: "توحيد إدارة المحتوى", description: "إدارة أنواع المحتوى والتصنيفات والمصادر والترجمات والنسخ والجدولة.", taskOrder: 0 },
      { taskKey: "OMNIS-P06-02", title: "التحقق والتوثيق", description: "قواعد تحقق مرجعية للنصوص القرآنية والأحاديث والمصادر والمراجعات.", taskOrder: 1 },
      { taskKey: "OMNIS-P06-03", title: "حوكمة التحرير والنشر", description: "مراحل مراجعة واعتماد ونشر وتراجع مع سجل تاريخي.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P07",
    phaseOrder: 7,
    title: "مركز الذكاء الاصطناعي والإنتاج",
    tasks: [
      { taskKey: "OMNIS-P07-01", title: "إدارة النماذج والمزودين", description: "إدارة المزود والنموذج والتوجيه والبدائل والحدود والميزانيات.", taskOrder: 0 },
      { taskKey: "OMNIS-P07-02", title: "مصنع الفيديو والصوت", description: "توحيد السكريبت والمشاهد والأصوات والرندر والقوالب والوسائط.", taskOrder: 1 },
      { taskKey: "OMNIS-P07-03", title: "بوابة الجودة والأصول", description: "تطبيق اختبارات المحتوى والوسائط والتصنيف والحقوق قبل التسليم للنشر.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P08",
    phaseOrder: 8,
    title: "النشر متعدد القنوات",
    tasks: [
      { taskKey: "OMNIS-P08-01", title: "توحيد الحسابات والقنوات", description: "إدارة OAuth والصلاحيات وحالة الاتصال لكل حساب ومنصة.", taskOrder: 0 },
      { taskKey: "OMNIS-P08-02", title: "إدارة الجدولة والطوابير", description: "جدولة مستقلة لكل قناة مع منع التكرار وإعادة المحاولة والعزل.", taskOrder: 1 },
      { taskKey: "OMNIS-P08-03", title: "التتبع والتحقق بعد النشر", description: "تسجيل معرف المنشور ورابطه ونتيجة التسليم ومؤشرات المزامنة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P09",
    phaseOrder: 9,
    title: "التحليلات والنمو والإيرادات",
    tasks: [
      { taskKey: "OMNIS-P09-01", title: "طبقة بيانات التحليلات", description: "توحيد المقاييس والمصادر والفترات واكتمال البيانات وتاريخ تحديثها.", taskOrder: 0 },
      { taskKey: "OMNIS-P09-02", title: "تحليلات الجمهور والمحتوى", description: "تقارير الموقع والتطبيق والمحتوى والمنصات والجمهور بصورة تحترم الخصوصية.", taskOrder: 1 },
      { taskKey: "OMNIS-P09-03", title: "النمو والربح وSEO", description: "لوحات الحملات والإيرادات الفعلية والتقديرية والظهور والفهرسة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P10",
    phaseOrder: 10,
    title: "محرك الأتمتة الشامل",
    tasks: [
      { taskKey: "OMNIS-P10-01", title: "مصمم تدفقات العمل", description: "بناء Triggers وConditions وActions وVerification من واجهة مرئية.", taskOrder: 0 },
      { taskKey: "OMNIS-P10-02", title: "موثوقية التنفيذ", description: "تطبيق Idempotency وRetries وTimeouts وRate Limits وDead Letter.", taskOrder: 1 },
      { taskKey: "OMNIS-P10-03", title: "اعتمادات وإيقاف واستعادة", description: "تطبيق Dry Run وموافقة بشرية وKill Switch ومسارات تعافٍ.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P11",
    phaseOrder: 11,
    title: "البنية التحتية والتطوير وDevOps",
    tasks: [
      { taskKey: "OMNIS-P11-01", title: "مركز الخدمات السحابية", description: "مراقبة Vercel وSupabase وGitHub وCI والتخزين والتكاملات.", taskOrder: 0 },
      { taskKey: "OMNIS-P11-02", title: "استوديو قاعدة البيانات وAPI", description: "جرد الجداول والترحيلات وRLS والفهارس والواجهات والـ webhooks.", taskOrder: 1 },
      { taskKey: "OMNIS-P11-03", title: "مركز تطوير الكود", description: "إدارة الفروع والـ commits وPRs والمراجعات والاختبارات والاعتماديات.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P12",
    phaseOrder: 12,
    title: "الأمن والحوكمة والاستمرارية",
    tasks: [
      { taskKey: "OMNIS-P12-01", title: "صلاحيات دقيقة وفصل الواجبات", description: "تطبيق RBAC/ABAC حسب الدور والمورد والعملية والبيئة والنطاق.", taskOrder: 0 },
      { taskKey: "OMNIS-P12-02", title: "مراقبة الأمان والأسرار", description: "فحص الأسرار والثغرات والجلسات وMFA وسجلات التدقيق دون كشف الأسرار.", taskOrder: 1 },
      { taskKey: "OMNIS-P12-03", title: "النسخ الاحتياطي والتعافي", description: "سياسات نسخ واستعادة مجربة وخطط حوادث وتراجع.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P13",
    phaseOrder: 13,
    title: "مساعد OMNIS الذكي",
    tasks: [
      { taskKey: "OMNIS-P13-01", title: "تأسيس وكلاء متخصصين", description: "تحديد وكلاء النظام والكود والبيانات والأمان والمحتوى والإنتاج والنمو.", taskOrder: 0 },
      { taskKey: "OMNIS-P13-02", title: "ربط الأدوات وسياق الموارد", description: "تقييد مصادر البيانات والأدوات والصلاحيات والميزانية لكل وكيل.", taskOrder: 1 },
      { taskKey: "OMNIS-P13-03", title: "تنسيق التحليل والإصلاح", description: "تعاون الوكلاء في تشخيص المشكلات وإعداد تغييرات قابلة للمراجعة.", taskOrder: 2 }
    ],
  },
  {
    phaseKey: "P14",
    phaseOrder: 14,
    title: "التحقق الشامل والتدرج للإنتاج",
    tasks: [
      { taskKey: "OMNIS-P14-01", title: "اختبارات العقود والتكامل", description: "اختبارات Unit وIntegration وE2E وRLS والصلاحيات وسيناريوهات الفشل.", taskOrder: 0 },
      { taskKey: "OMNIS-P14-02", title: "اختبار التحمل والاستعادة", description: "قياس الأداء والطوابير والتعافي والتراجع وحماية البيانات.", taskOrder: 1 },
      { taskKey: "OMNIS-P14-03", title: "إطلاق تدريجي وإغلاق موثق", description: "Preview ثم Staging ثم إنتاج بعد موافقات بوابات الإصدار وإغلاق الفجوات.", taskOrder: 2 }
    ],
  }
] as const;

export const OMNIS_TASK_STATE_LABELS: Record<OmnisTaskState, string> = {
  pending: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  blocked: "متوقف بسبب عائق",
  completed: "مكتمل بدليل",
};

export const OMNIS_TASK_STATE_STYLES: Record<OmnisTaskState, string> = {
  pending: "border-slate-500/20 bg-slate-500/5 text-slate-300",
  in_progress: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  blocked: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
};
