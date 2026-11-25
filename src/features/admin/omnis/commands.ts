export type OmnisSafeCommandKey = "refresh-operational-status";

export type OmnisSafeCommand = {
  key: OmnisSafeCommandKey;
  label: string;
  description: string;
  permission: "system.manage";
  operation: "inspect";
  mutates: false;
  requiresStepUp: false;
};

/** Explicit read-only allow-list. Mutating commands must use module-owned adapters. */
export const OMNIS_SAFE_COMMANDS: readonly OmnisSafeCommand[] = [
  {
    key: "refresh-operational-status",
    label: "إعادة فحص الحالة التشغيلية",
    description: "إعادة قراءة فحوص Supabase وGitHub وطابور الفيديو وVercel وتسجيل النتيجة.",
    permission: "system.manage",
    operation: "inspect",
    mutates: false,
    requiresStepUp: false,
  },
] as const;

export function resolveOmnisSafeCommand(value: unknown): OmnisSafeCommand | null {
  if (typeof value !== "string") return null;
  return OMNIS_SAFE_COMMANDS.find((command) => command.key === value) ?? null;
}
