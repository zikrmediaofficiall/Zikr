import "server-only";

import { getCurrentProfile } from "@/features/admin/services/admin";
import { hasAdminPermission, type AdminRole } from "@/features/admin/services/permissions";
import {
  isValidControlPlaneRequest,
  type ControlPlaneAuthorization,
  type ControlPlaneCommandDefinition,
  type ControlPlaneCommandRequest,
} from "@/features/admin/omnis/contracts";

/**
 * This is an allow-list of command contracts, not a generic command runner.
 * Every mutating command is marked for step-up and must be dispatched through
 * its module-owned server action/API adapter after this authorization check.
 */
export const CONTROL_PLANE_COMMANDS: readonly ControlPlaneCommandDefinition[] = [
  {
    key: "module.inspect",
    label: "فحص وحدة",
    description: "قراءة حالة الوحدة وبياناتها التشغيلية المسموح بها.",
    operation: "read",
    permission: "system.manage",
    scope: "module",
    risk: "low",
    mutates: false,
    requiresStepUp: false,
    adapter: "module-owned",
  },
  {
    key: "configuration.read",
    label: "قراءة الإعدادات",
    description: "قراءة إعدادات الوحدة من الخدمة المالكة لها.",
    operation: "read",
    permission: "settings.manage",
    scope: "module",
    risk: "low",
    mutates: false,
    requiresStepUp: false,
    adapter: "module-owned",
  },
  {
    key: "configuration.update",
    label: "تعديل إعداد",
    description: "طلب تعديل إعداد typed عبر الخدمة المالكة مع التحقق والتدقيق.",
    operation: "update",
    permission: "settings.manage",
    scope: "resource",
    risk: "high",
    mutates: true,
    requiresStepUp: true,
    adapter: "module-owned",
  },
  {
    key: "automation.execute",
    label: "تشغيل أتمتة",
    description: "تشغيل Workflow مسجل ومسموح به دون تنفيذ شيفرة حرة.",
    operation: "execute",
    permission: "system.manage",
    scope: "resource",
    risk: "high",
    mutates: true,
    requiresStepUp: true,
    adapter: "module-owned",
  },
  {
    key: "publishing.execute",
    label: "تنفيذ نشر",
    description: "إرسال عملية نشر إلى موصل المنصة بعد التحقق والموافقة.",
    operation: "execute",
    permission: "social.publish",
    scope: "resource",
    risk: "critical",
    mutates: true,
    requiresStepUp: true,
    adapter: "module-owned",
  },
  {
    key: "release.promote",
    label: "ترقية إصدار",
    description: "طلب ترقية إصدار عبر بوابة الإصدار المحمية الحالية.",
    operation: "execute",
    permission: "release.manage",
    scope: "resource",
    risk: "critical",
    mutates: true,
    requiresStepUp: true,
    adapter: "module-owned",
  },
  {
    key: "database.migration.apply",
    label: "تطبيق ترحيل",
    description: "طلب تطبيق Migration مراجعة عبر بوابة النشر وقاعدة البيانات.",
    operation: "execute",
    permission: "system.manage",
    scope: "resource",
    risk: "critical",
    mutates: true,
    requiresStepUp: true,
    adapter: "module-owned",
  },
] as const;

const COMMAND_BY_KEY = new Map(CONTROL_PLANE_COMMANDS.map((command) => [command.key, command]));

export function getControlPlaneCapabilities(role: AdminRole) {
  return CONTROL_PLANE_COMMANDS
    .filter((command) => hasAdminPermission(role, command.permission))
    .map((command) => ({
      ...command,
      authorized: true as const,
      executableThroughControlPlane: false as const,
      executionNote: command.mutates
        ? "يتطلب موصل الوحدة المالكة والتحقق الإضافي قبل التنفيذ."
        : "قراءة فقط عبر موصل الوحدة المالكة.",
    }));
}

/**
 * Server-side authorization contract. A successful result is not itself
 * permission to execute: mutating adapters must additionally invoke their
 * existing step-up guard, validate their typed payload, and write an audit event.
 */
export async function authorizeControlPlaneCommand(
  request: ControlPlaneCommandRequest,
): Promise<ControlPlaneAuthorization> {
  if (!isValidControlPlaneRequest(request)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      error: "طلب التحكم غير صالح.",
    };
  }

  const command = COMMAND_BY_KEY.get(request.commandKey);
  if (!command || command.scope !== request.scope) {
    return {
      ok: false,
      status: 400,
      code: "unknown_command",
      error: "أمر التحكم غير مسجل أو لا يطابق نطاق المورد.",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      ok: false,
      status: 401,
      code: "unauthenticated",
      error: "يلزم تسجيل الدخول بحساب إداري.",
    };
  }

  if (!hasAdminPermission(profile.role, command.permission)) {
    return {
      ok: false,
      status: 403,
      code: "permission_denied",
      error: "لا تملك الصلاحية المطلوبة لتنفيذ هذا الأمر.",
    };
  }

  return {
    ok: true,
    actor: { userId: profile.id, role: profile.role },
    command,
    stepUpRequired: command.requiresStepUp,
  };
}
