export type OmnisSafeCommandKey =
  | "refresh-operational-status"
  | "pause-video-automation"
  | "resume-video-automation";

export type OmnisSafeCommand = {
  key: OmnisSafeCommandKey;
  label: string;
  description: string;
  permission: "system.manage";
  operation: "inspect" | "pause" | "resume";
  risk: "low" | "high" | "critical";
  mutates: boolean;
  requiresStepUp: boolean;
  adapter: "omnis-readonly" | "admin-settings-versioned";
};

export const OMNIS_SAFE_COMMANDS: readonly OmnisSafeCommand[] = [
  {
    key: "refresh-operational-status",
    label: "إعادة فحص الحالة التشغيلية",
    description: "إعادة قراءة فحوص Supabase وGitHub وطابور الفيديو وVercel وتسجيل النتيجة.",
    permission: "system.manage", operation: "inspect", risk: "low",
    mutates: false, requiresStepUp: false, adapter: "omnis-readonly",
  },
  {
    key: "pause-video-automation",
    label: "إيقاف توليد الفيديوهات",
    description: "تفعيل مفتاح الإيقاف المركزي لعامل الفيديو دون حذف الطلبات أو تغيير النشر الاجتماعي.",
    permission: "system.manage", operation: "pause", risk: "high",
    mutates: true, requiresStepUp: true, adapter: "admin-settings-versioned",
  },
  {
    key: "resume-video-automation",
    label: "استئناف توليد الفيديوهات",
    description: "إعادة تفعيل عامل الفيديو؛ قد تستأنف الدورات المجدولة وتستهلك موارد مزودي الذكاء الاصطناعي.",
    permission: "system.manage", operation: "resume", risk: "critical",
    mutates: true, requiresStepUp: true, adapter: "admin-settings-versioned",
  },
] as const;

export function resolveOmnisSafeCommand(value: unknown): OmnisSafeCommand | null {
  if (typeof value !== "string") return null;
  return OMNIS_SAFE_COMMANDS.find((command) => command.key === value) ?? null;
}
