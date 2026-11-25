import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/admin/services/admin";
import type { AdminPermission } from "@/features/admin/services/permissions";
import { sanitizeAdminAuditMetadata } from "@/features/admin/services/audit-metadata";

export type AdminAuditOutcome = "success" | "denied" | "failed";

export type AdminAuditEvent = {
  action: string;
  permission?: AdminPermission;
  resourceType?: string;
  resourceId?: string | null;
  outcome?: AdminAuditOutcome;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Append one administrative event to the immutable audit stream. */
export async function recordAdminAuditEvent(event: AdminAuditEvent): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Administrative audit requires an authenticated user.");

  const requestId = event.requestId ?? crypto.randomUUID();
  await supabaseServerAdminRequest("/rest/v1/admin_audit_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: profile.id,
      action: event.action,
      permission: event.permission ?? null,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      outcome: event.outcome ?? "success",
      request_id: requestId,
      metadata: sanitizeAdminAuditMetadata(event.metadata),
    }),
  });
}
