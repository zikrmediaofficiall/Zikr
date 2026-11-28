import { DEFAULT_VIDEO_DAILY_TARGET, MAX_VIDEO_DAILY_TARGET } from "@/features/videos/config/daily-target";
import type { AdminPermission } from "@/features/admin/services/permissions";

type StepUpPolicy = "always" | "policy" | "none";
type AdminSettingCategory = "security" | "platform" | "video";

type EditableSettingBase = {
  editable: true;
  key: string;
  label: string;
  description: string;
  category: AdminSettingCategory;
  owner: string;
  dependencies: readonly string[];
  permission: AdminPermission;
  stepUpPolicy: StepUpPolicy;
  storage: "public.admin_settings";
  revalidatePaths: readonly string[];
};

export type BooleanAdminSettingDefinition = EditableSettingBase & {
  valueType: "boolean";
  runtimeFallback: boolean;
  missingValuePolicy: "documented-fallback" | "fail-closed";
};

export type IntegerAdminSettingDefinition = EditableSettingBase & {
  valueType: "integer";
  minimum: number;
  maximum: number;
  runtimeFallback: number;
  /** Initial value shown in the admin form when no persisted value exists. */
  formFallback: number;
  missingValuePolicy: "documented-fallback";
};

export type EditableAdminSettingDefinition =
  | BooleanAdminSettingDefinition
  | IntegerAdminSettingDefinition;

export type InternalAdminSettingDefinition = {
  editable: false;
  key: string;
  label: string;
  description: string;
  category: "internal";
  owner: string;
  dependencies: readonly string[];
  storage: "public.admin_settings";
  valueType: "workflow-state" | "worker-cursor" | "operational-lock" | "specialized-config";
  reason: string;
};

export type AdminSettingDefinition =
  | EditableAdminSettingDefinition
  | InternalAdminSettingDefinition;

/**
 * Central contract for editable admin_settings rows.
 *
 * runtimeFallback documents the value shown/used when a row is absent; it is
 * not a database write and does not make an unknown provider connection healthy.
 * Internal worker cursors, locks, operation snapshots and specialized JSON
 * settings are listed separately and are never writable through generic forms.
 */
export const ADMIN_SETTING_REGISTRY: readonly AdminSettingDefinition[] = [
  {
    editable: true,
    key: "require_mfa_for_destructive",
    label: "طلب MFA قبل العمليات الحساسة",
    description: "يتحكم في طبقة الإحالة قبل الحذف والنشر والعمليات الخطرة.",
    category: "security",
    owner: "Identity & Access",
    dependencies: ["admin.security-policy", "supabase.admin_settings", "admin_audit_events"],
    permission: "settings.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: false,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/settings", "/admin/security"],
  },
  {
    editable: true,
    key: "maintenance_mode",
    label: "وضع الصيانة",
    description: "يوقف واجهات الصيانة التي تعتمد على هذا الإعداد دون تغيير بيانات المحتوى.",
    category: "platform",
    owner: "Platform Operations",
    dependencies: ["site.maintenance-mode", "supabase.admin_settings"],
    permission: "settings.manage",
    stepUpPolicy: "policy",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: false,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/settings"],
  },
  {
    editable: true,
    key: "admin_alerts_enabled",
    label: "تنبيهات الإدارة",
    description: "يسمح لمركز الإدارة بعرض والتنبيه عن الأحداث التشغيلية المهمة.",
    category: "platform",
    owner: "Platform Operations",
    dependencies: ["admin.queue-alerts", "supabase.admin_settings"],
    permission: "settings.manage",
    stepUpPolicy: "policy",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: true,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/settings", "/admin/health"],
  },
  {
    editable: true,
    key: "search_result_limit",
    label: "حد نتائج البحث المركزي",
    description: "قيمة من 10 إلى 100 لتجنب استعلامات ضخمة داخل مركز الإدارة.",
    category: "platform",
    owner: "Admin Platform",
    dependencies: ["admin.search", "supabase.admin_settings"],
    permission: "settings.manage",
    stepUpPolicy: "none",
    storage: "public.admin_settings",
    valueType: "integer",
    minimum: 10,
    maximum: 100,
    runtimeFallback: 25,
    formFallback: 40,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/settings"],
  },
  {
    editable: true,
    key: "video_automation_enabled",
    label: "توليد الفيديوهات تلقائيًا",
    description: "مفتاح إيقاف التوليد الداخلي؛ غياب الإعداد أو تعذر قراءته يوقف العامل احترازيًا.",
    category: "video",
    owner: "Video Operations",
    dependencies: ["video-generation-worker", "video_purge_in_progress", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: false,
    missingValuePolicy: "fail-closed",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_auto_publish",
    label: "النشر التلقائي على منصات التواصل بعد اجتياز QA",
    description: "يسمح بإدراج الفيديوهات المؤهلة في طابور النشر الخارجي بعد اجتياز فحوص الجودة؛ لا يثبت جاهزية OAuth أو المنصة.",
    category: "video",
    owner: "Social & Video Operations",
    dependencies: ["video-qa", "social-publishing-worker", "provider-oauth", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: false,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/social", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_batch_size",
    label: "عدد الطلبات في كل دورة",
    description: "حجم الدفعة التي يقرأها عامل الفيديو من إعدادات الإدارة.",
    category: "video",
    owner: "Video Operations",
    dependencies: ["video-generation-worker", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "integer",
    minimum: 1,
    maximum: 10,
    runtimeFallback: 3,
    formFallback: 10,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_ai_enabled",
    label: "توليد المشاهد بالذكاء الاصطناعي",
    description: "يسمح بمحاولات مزودي الفيديو المدعومين مع الرجوع الآمن إلى قالب FFmpeg.",
    category: "video",
    owner: "AI & Video Operations",
    dependencies: ["video-provider-registry", "ffmpeg-fallback", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "boolean",
    runtimeFallback: true,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_daily_target",
    label: "الهدف اليومي للفيديوهات",
    description: "الهدف اليومي للفيديوهات. الحد الأقصى يطابق ما يعالجه عامل الفيديو فعليًا (فيديوهان يوميًا في مرحلة التجربة).",
    category: "video",
    owner: "Video Operations",
    dependencies: ["video-automation-quota", "video-generation-worker", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "integer",
    minimum: 1,
    maximum: MAX_VIDEO_DAILY_TARGET,
    runtimeFallback: DEFAULT_VIDEO_DAILY_TARGET,
    formFallback: DEFAULT_VIDEO_DAILY_TARGET,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_ai_attempts_per_run",
    label: "محاولات مزودات الفيديو الذكية لكل دورة",
    description: "عدد محاولات مزودي الفيديو المجانية قبل الرجوع إلى القالب المحلي.",
    category: "video",
    owner: "AI & Video Operations",
    dependencies: ["video-provider-registry", "video-generation-worker", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "integer",
    minimum: 0,
    maximum: 4,
    runtimeFallback: 4,
    formFallback: 4,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: true,
    key: "video_automation_video_seconds",
    label: "مدة الفيديو الافتراضية بالثواني",
    description: "المدة الافتراضية للأصول المرئية المولدة.",
    category: "video",
    owner: "Video Operations",
    dependencies: ["video-composition", "video-generation-worker", "supabase.admin_settings"],
    permission: "system.manage",
    stepUpPolicy: "always",
    storage: "public.admin_settings",
    valueType: "integer",
    minimum: 10,
    maximum: 45,
    runtimeFallback: 25,
    formFallback: 25,
    missingValuePolicy: "documented-fallback",
    revalidatePaths: ["/admin/automation", "/admin/health"],
  },
  {
    editable: false,
    key: "android_release_operation",
    label: "حالة عملية إصدار Android",
    description: "لقطة حالة داخلية لمسار إصدار التطبيق وليست إعدادًا قابلًا للتحرير.",
    category: "internal",
    owner: "Mobile Release Operations",
    dependencies: ["android-release-workflow", "github-actions", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "workflow-state",
    reason: "تُدار حصريًا بواسطة مسار الإصدار؛ لا تُعرض أو تُعدّل من محرر الإعدادات العام.",
  },
  {
    editable: false,
    key: "social_insights_scan_cursor_facebook_reels",
    label: "مؤشر فحص Facebook Reels",
    description: "مؤشر تدوير داخلي لمسح مؤشرات النشر الاجتماعي.",
    category: "internal",
    owner: "Social Analytics Worker",
    dependencies: ["facebook-reels-insights-worker", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "worker-cursor",
    reason: "حالة عامل داخلية؛ تعديلها يدويًا قد يسبب تخطي عناصر أو تكرار المسح.",
  },
  {
    editable: false,
    key: "social_insights_scan_cursor_youtube",
    label: "مؤشر فحص YouTube",
    description: "مؤشر تدوير داخلي لمسح مؤشرات YouTube.",
    category: "internal",
    owner: "Social Analytics Worker",
    dependencies: ["youtube-analytics-worker", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "worker-cursor",
    reason: "حالة عامل داخلية؛ تعديلها يدويًا قد يسبب تخطي عناصر أو تكرار المسح.",
  },
  {
    editable: false,
    key: "video_purge_in_progress",
    label: "قفل تنظيف ملفات الفيديو",
    description: "قفل تشغيلي مؤقت يمنع التوليد أثناء تنظيف وسائط ZIKR.",
    category: "internal",
    owner: "Video Retention Worker",
    dependencies: ["video-retention-worker", "video-generation-worker", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "operational-lock",
    reason: "القفل يملكه عامل التنظيف ويُدار بمقارنة وتحديث ذري؛ لا يُعدّل من إعدادات عامة.",
  },
  {
    editable: false,
    key: "video_automation_run_now",
    label: "طلب تشغيل فيديو عاجل",
    description: "طلب تشغيل/توزيع عمل مؤقت وليس إعدادًا دائمًا.",
    category: "internal",
    owner: "Video Automation Workflow",
    dependencies: ["video-automation-workflow-dispatch", "video-generation-worker", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "workflow-state",
    reason: "يُنشأ ويُستهلك عبر مسار طلب التشغيل؛ لا يُعرض أو يُعدّل عبر محرر الإعدادات العام.",
  },
  {
    editable: false,
    key: "video_custom_spaces",
    label: "مزودات فيديو مخصصة",
    description: "تهيئة منظمة لمزودات Gradio المخصصة.",
    category: "internal",
    owner: "AI & Video Operations",
    dependencies: ["video-provider-registry", "huggingface-gradio", "supabase.admin_settings"],
    storage: "public.admin_settings",
    valueType: "specialized-config",
    reason: "تستخدم مسار تحقق مخصصًا لحقول متعددة؛ يمنع قبول JSON عام أو تعديلها من نموذج مفتاح/قيمة.",
  },
];

export function getAdminSettingDefinition(key: string): AdminSettingDefinition | undefined {
  return ADMIN_SETTING_REGISTRY.find((definition) => definition.key === key);
}

export function getEditableAdminSettingDefinition(
  key: string,
): EditableAdminSettingDefinition | undefined {
  const definition = getAdminSettingDefinition(key);
  return definition?.editable ? definition : undefined;
}

export function getIntegerAdminSettingDefinition(
  key: string,
): IntegerAdminSettingDefinition | undefined {
  const definition = getEditableAdminSettingDefinition(key);
  return definition?.valueType === "integer" ? definition : undefined;
}

export type AdminSettingValidationResult =
  | { ok: true; definition: EditableAdminSettingDefinition; value: boolean | number }
  | { ok: false; error: string };

export function validateAdminSettingValue(
  key: string,
  rawValue: string,
): AdminSettingValidationResult {
  const definition = getEditableAdminSettingDefinition(key);
  if (!definition) {
    return { ok: false, error: "الإعداد غير معروف أو غير قابل للتحرير من هذا المسار." };
  }

  if (definition.valueType === "boolean") {
    if (rawValue !== "true" && rawValue !== "false") {
      return { ok: false, error: "قيمة منطقية غير صالحة." };
    }
    return { ok: true, definition, value: rawValue === "true" };
  }

  const normalized = rawValue.trim();
  if (!/^-?\d+$/.test(normalized)) {
    return { ok: false, error: "يجب إدخال عدد صحيح." };
  }
  const numeric = Number(normalized);
  if (!Number.isSafeInteger(numeric) || numeric < definition.minimum || numeric > definition.maximum) {
    return {
      ok: false,
      error: `القيمة يجب أن تكون عددًا صحيحًا بين ${definition.minimum} و${definition.maximum}.`,
    };
  }
  return { ok: true, definition, value: numeric };
}
