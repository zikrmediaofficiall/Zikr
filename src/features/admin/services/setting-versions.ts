import "server-only";

import { getEditableAdminSettingDefinition } from "@/features/admin/config/settings-registry";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

export type AdminSettingVersion = {
  id: string;
  setting_key: string;
  value: boolean | number;
  operation: "baseline" | "update" | "rollback";
  source_version_id: string | null;
  actor_user_id: string | null;
  created_at: string;
};

export type AdminSettingVersionHistory = {
  available: boolean;
  versions: AdminSettingVersion[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveAdminSettingVersion(input: {
  key: string;
  value: boolean | number;
  actorUserId: string;
}): Promise<string> {
  const definition = getEditableAdminSettingDefinition(input.key);
  if (!definition || !UUID_PATTERN.test(input.actorUserId)) {
    throw new Error("Invalid admin setting version request.");
  }

  const result = await supabaseServerAdminRequest<string>(
    "/rest/v1/rpc/save_admin_setting_version",
    {
      method: "POST",
      body: JSON.stringify({
        p_setting_key: input.key,
        p_value: input.value,
        p_actor_user_id: input.actorUserId,
      }),
    },
  );

  if (typeof result !== "string" || !UUID_PATTERN.test(result)) {
    throw new Error("Supabase did not confirm the saved setting version.");
  }
  return result;
}

export async function getAdminSettingVersionById(
  versionId: string,
): Promise<AdminSettingVersion | null> {
  if (!UUID_PATTERN.test(versionId)) return null;

  const rows = await supabaseServerAdminRequest<AdminSettingVersion[]>(
    `/rest/v1/admin_setting_versions?id=eq.${encodeURIComponent(versionId)}&select=id,setting_key,value,operation,source_version_id,actor_user_id,created_at&limit=1`,
  );
  const version = rows?.[0];
  if (!version || !getEditableAdminSettingDefinition(version.setting_key)) return null;
  if (
    typeof version.value !== "boolean" &&
    !(typeof version.value === "number" && Number.isSafeInteger(version.value))
  ) return null;
  return version;
}

export async function getAdminSettingVersionHistory(
  settingKeys: readonly string[],
  limit = 30,
): Promise<AdminSettingVersionHistory> {
  const allowedKeys = [...new Set(settingKeys)].filter(
    (key) => Boolean(getEditableAdminSettingDefinition(key)),
  );
  if (allowedKeys.length === 0) return { available: true, versions: [] };

  const boundedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const keyFilter = allowedKeys.map((key) => encodeURIComponent(key)).join(",");
  try {
    const rows = await supabaseServerAdminRequest<AdminSettingVersion[]>(
      `/rest/v1/admin_setting_versions?setting_key=in.(${keyFilter})&select=id,setting_key,value,operation,source_version_id,actor_user_id,created_at&order=created_at.desc&limit=${boundedLimit}`,
    );
    return {
      available: true,
      versions: (rows ?? []).filter((row) => Boolean(getEditableAdminSettingDefinition(row.setting_key))),
    };
  } catch (error) {
    console.error("[admin/settings] version history unavailable", error);
    return { available: false, versions: [] };
  }
}

export async function restoreAdminSettingVersion(input: {
  versionId: string;
  actorUserId: string;
}): Promise<{ id: string; setting_key: string; value: boolean | number }> {
  if (!UUID_PATTERN.test(input.versionId) || !UUID_PATTERN.test(input.actorUserId)) {
    throw new Error("Invalid admin setting restore request.");
  }

  const result = await supabaseServerAdminRequest<{
    id: string;
    setting_key: string;
    value: boolean | number;
    operation: "rollback";
    source_version_id: string;
  }>("/rest/v1/rpc/restore_admin_setting_version", {
    method: "POST",
    body: JSON.stringify({
      p_version_id: input.versionId,
      p_actor_user_id: input.actorUserId,
    }),
  });

  const definition = result && getEditableAdminSettingDefinition(result.setting_key);
  if (
    !definition ||
    typeof result.id !== "string" ||
    !UUID_PATTERN.test(result.id) ||
    (typeof result.value !== "boolean" &&
      !(typeof result.value === "number" && Number.isSafeInteger(result.value)))
  ) {
    throw new Error("Supabase did not confirm a valid restored setting version.");
  }
  return { id: result.id, setting_key: result.setting_key, value: result.value };
}
