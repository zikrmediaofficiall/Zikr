import "server-only";

import { getCurrentProfile } from "@/features/admin/services/admin";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
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
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_ID = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/;

function auditSafeToken(value: unknown): string | null {
  return typeof value === "string" && RESOURCE_ID.test(value) ? value : null;
}

/**
 * Audits an interactive authorization decision, never the passive health probes
 * or the request payload. A failed audit write fails closed: no authorization
 * result is returned to the caller.
 */
async function auditControlPlaneDecision(input: {
  requestId: string;
  outcome: "success" | "denied";
  reason: string;
  command?: ControlPlaneCommandDefinition;
  requestedCommandKey: string | null;
  requestedResourceType: string | null;
  requestedResourceId: string | null;
  requestedScope: string | null;
  actorRole: AdminRole;
}): Promise<void> {
  const { command } = input;
  await recordAdminAuditEvent({
    action: "admin.omnis.control_plane.authorization",
    permission: command?.permission,
    resourceType: "omnis_control_plane_command",
    resourceId: command?.key ?? input.requestedCommandKey ?? "invalid_request",
    outcome: input.outcome,
    requestId: input.requestId,
    metadata: {
      decision: input.outcome === "success" ? "authorized" : "denied",
      reason: input.reason,
      executionState: input.outcome === "success" ? "authorized_not_executed" : "not_authorized",
      actorRole: input.actorRole,
      commandKey: command?.key ?? input.requestedCommandKey,
      operation: command?.operation ?? null,
      risk: command?.risk ?? null,
      resourceScope: input.requestedScope,
      targetResourceType: input.requestedResourceType,
      targetResourceId: input.requestedResourceId,
      mutates: command?.mutates ?? null,
      stepUpRequired: command?.requiresStepUp ?? null,
      adapter: command?.adapter ?? null,
    },
  });
}

/**
 * Server-side authorization contract. Each authenticated command attempt is
 * recorded in the canonical immutable audit stream. A success means only
 * "authorized", not "executed"; mutation adapters still need step-up, payload
 * validation, and their own post-commit audit event.
 */
export async function authorizeControlPlaneCommand(
  request: ControlPlaneCommandRequest,
): Promise<ControlPlaneAuthorization> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      ok: false,
      status: 401,
      code: "unauthenticated",
      error: "يلزم تسجيل الدخول بحساب إداري.",
    };
  }

  const candidate = request && typeof request === "object" && !Array.isArray(request)
    ? request as unknown as Record<string, unknown>
    : {};
  const requestedCommandKey = auditSafeToken(candidate.commandKey);
  const requestedResourceType = auditSafeToken(candidate.resourceType);
  const requestedResourceId = auditSafeToken(candidate.resourceId);
  const requestedScope = ["global", "module", "resource"].includes(String(candidate.scope))
    ? String(candidate.scope)
    : null;
  const requestId = typeof candidate.requestId === "string" && REQUEST_ID.test(candidate.requestId)
    ? candidate.requestId
    : crypto.randomUUID();

  if (!isValidControlPlaneRequest(request)) {
    await auditControlPlaneDecision({
      requestId,
      outcome: "denied",
      reason: "invalid_request",
      requestedCommandKey,
      requestedResourceType,
      requestedResourceId,
      requestedScope,
      actorRole: profile.role,
    });
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      error: "طلب التحكم غير صالح.",
    };
  }

  const command = COMMAND_BY_KEY.get(request.commandKey);
  if (!command || command.scope !== request.scope) {
    await auditControlPlaneDecision({
      requestId,
      outcome: "denied",
      reason: "unknown_command_or_scope_mismatch",
      command,
      requestedCommandKey,
      requestedResourceType,
      requestedResourceId,
      requestedScope,
      actorRole: profile.role,
    });
    return {
      ok: false,
      status: 400,
      code: "unknown_command",
      error: "أمر التحكم غير مسجل أو لا يطابق نطاق المورد.",
    };
  }

  if (!hasAdminPermission(profile.role, command.permission)) {
    await auditControlPlaneDecision({
      requestId,
      outcome: "denied",
      reason: "permission_denied",
      command,
      requestedCommandKey,
      requestedResourceType,
      requestedResourceId,
      requestedScope,
      actorRole: profile.role,
    });
    return {
      ok: false,
      status: 403,
      code: "permission_denied",
      error: "لا تملك الصلاحية المطلوبة لتنفيذ هذا الأمر.",
    };
  }

  await auditControlPlaneDecision({
    requestId,
    outcome: "success",
    reason: "permission_granted",
    command,
    requestedCommandKey,
    requestedResourceType,
    requestedResourceId,
    requestedScope,
    actorRole: profile.role,
  });

  return {
    ok: true,
    actor: { userId: profile.id, role: profile.role },
    command,
    stepUpRequired: command.requiresStepUp,
  };
}
