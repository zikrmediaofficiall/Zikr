/**
 * OMNIS P12-01: attribute rules on top of role permissions (ABAC by environment and scope).
 * Optional JSON in ADMIN_ABAC_POLICY, for example:
 *   [{"permission":"system.manage","environments":["production"],"roles":["super_admin"]},
 *    {"permission":"content.delete","environments":["production"],"roles":["super_admin","content_manager"]}]
 * A rule applies when its permission matches (exact or "*") and the current environment is listed
 * (or none is listed). When it applies, only the listed roles pass. With no policy nothing changes.
 * Optional "scopes" narrows a rule to resources whose scope tag matches (for example "kids").
 * Rules only ever restrict: they cannot grant a permission the role does not already have.
 */
export type AbacRule = { permission: string; environments?: string[]; roles?: string[]; scopes?: string[] };
export type AbacRequest = { permission: string; role: string; environment: string; scope?: string };

export function parseAbacPolicy(raw: string | undefined | null): AbacRule[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string").map((v) => v.trim()) : undefined);
    return parsed.flatMap((item): AbacRule[] => {
      if (!item || typeof item !== "object") return [];
      const r = item as Record<string, unknown>;
      if (typeof r.permission !== "string" || !r.permission.trim()) return [];
      return [{ permission: r.permission.trim(), environments: list(r.environments), roles: list(r.roles), scopes: list(r.scopes) }];
    });
  } catch {
    return [];
  }
}

export function currentEnvironment(env: Record<string, string | undefined> = process.env): string {
  return env.VERCEL_ENV || env.NODE_ENV || "development";
}

export function abacAllows(request: AbacRequest, rules: readonly AbacRule[]): boolean {
  for (const rule of rules) {
    if (rule.permission !== "*" && rule.permission !== request.permission) continue;
    if (rule.environments?.length && !rule.environments.includes(request.environment)) continue;
    if (rule.scopes?.length && (!request.scope || !rule.scopes.includes(request.scope))) continue;
    // An applicable rule with no roles listed denies everyone; with roles, only they pass.
    if (!rule.roles?.includes(request.role)) return false;
  }
  return true;
}
