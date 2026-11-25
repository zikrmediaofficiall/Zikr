import type { AdminPermission, AdminRole } from "@/features/admin/services/permissions";

/**
 * Shared contract for all OMNIS control-plane adapters.
 * Resource-specific payload validation and execution remain owned by each
 * module adapter; this layer never executes arbitrary SQL, shell, or JavaScript.
 */
export type ControlPlaneOperation = "read" | "create" | "update" | "delete" | "execute";
export type ControlPlaneRisk = "low" | "medium" | "high" | "critical";
export type ControlPlaneResourceScope = "global" | "module" | "resource";

export type ControlPlaneActor = {
  userId: string;
  role: AdminRole;
};

export type ControlPlaneCommandDefinition = {
  key: string;
  label: string;
  description: string;
  operation: ControlPlaneOperation;
  permission: AdminPermission;
  scope: ControlPlaneResourceScope;
  risk: ControlPlaneRisk;
  mutates: boolean;
  requiresStepUp: boolean;
  adapter: "module-owned";
};

export type ControlPlaneCommandRequest<TPayload = unknown> = {
  commandKey: string;
  resourceType: string;
  resourceId?: string;
  scope: ControlPlaneResourceScope;
  payload?: TPayload;
  idempotencyKey?: string;
  requestId?: string;
};

export type ControlPlaneAuthorization =
  | {
      ok: true;
      actor: ControlPlaneActor;
      command: ControlPlaneCommandDefinition;
      stepUpRequired: boolean;
    }
  | {
      ok: false;
      status: 400 | 401 | 403;
      code: "invalid_request" | "unauthenticated" | "unknown_command" | "permission_denied";
      error: string;
    };

export type ControlPlaneReadResult<T> =
  | { ok: true; data: T; source: string; generatedAt: string }
  | { ok: false; data: null; source: string; generatedAt: string; error: string };

const RESOURCE_TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/;
const IDEMPOTENCY_TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,127}$/;\nconst REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidControlPlaneRequest(
  value: unknown,
): value is ControlPlaneCommandRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (typeof request.commandKey !== "string" || !RESOURCE_TOKEN.test(request.commandKey)) return false;
  if (typeof request.resourceType !== "string" || !RESOURCE_TOKEN.test(request.resourceType)) return false;
  if (!["global", "module", "resource"].includes(String(request.scope))) return false;
  if (request.resourceId !== undefined &&
      (typeof request.resourceId !== "string" || !RESOURCE_TOKEN.test(request.resourceId))) return false;
  if (request.idempotencyKey !== undefined &&
      (typeof request.idempotencyKey !== "string" || !IDEMPOTENCY_TOKEN.test(request.idempotencyKey))) return false;
  return true;
}
