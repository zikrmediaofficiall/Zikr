/**
 * Provider health summary for Admin (P10). Pure and read-only: it derives
 * per-provider counts from recent video_generation_requests rows. It never
 * reads secrets and only reports whether a secret NAME is set.
 */
export type ProviderRequestRow = {
  provider?: string | null;
  status?: string | null;
  error_message?: string | null;
  render_duration_ms?: number | null;
  updated_at?: string | null;
};

export type ProviderHealth = {
  provider: string;
  total: number;
  completed: number;
  failed: number;
  successRate: number | null;
  avgDurationSec: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
};

const REDACTIONS: Array<[RegExp, string]> = [
  [/(authorization|bearer|token|api[_-]?key|secret|password)\s*[:=]?\s*[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [redacted]"],
  [/\b(?:sk|hf|ghp|eyJ)[A-Za-z0-9._-]{16,}/g, "[redacted]"],
  [/https?:\/\/[^\s)]+/g, "[url]"],
];

export function sanitizeProviderError(value: string | null | undefined, max = 160): string | null {
  if (!value) return null;
  let text = value.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of REDACTIONS) text = text.replace(pattern, replacement);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function summarizeProviderHealth(rows: ProviderRequestRow[]): ProviderHealth[] {
  const byProvider = new Map<string, ProviderRequestRow[]>();
  for (const row of rows) {
    const name = row.provider?.trim() || "template";
    byProvider.set(name, [...(byProvider.get(name) ?? []), row]);
  }
  const out: ProviderHealth[] = [];
  for (const [provider, list] of byProvider) {
    const finished = list.filter((r) => r.status === "completed" || r.status === "failed");
    const completed = finished.filter((r) => r.status === "completed");
    const failed = finished.filter((r) => r.status === "failed");
    const durations = completed
      .map((r) => r.render_duration_ms)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    const latest = (items: ProviderRequestRow[]) =>
      items.map((r) => r.updated_at ?? "").filter(Boolean).sort().at(-1) ?? null;
    const lastFailure = [...failed].sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? "")).at(-1);
    out.push({
      provider,
      total: list.length,
      completed: completed.length,
      failed: failed.length,
      successRate: finished.length ? Math.round((completed.length / finished.length) * 100) : null,
      avgDurationSec: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 100) / 10 : null,
      lastSuccessAt: latest(completed),
      lastFailureAt: latest(failed),
      lastError: sanitizeProviderError(lastFailure?.error_message),
    });
  }
  return out.sort((a, b) => b.total - a.total || a.provider.localeCompare(b.provider));
}

/** Names of required secrets that are missing. Values are never read into the result. */
export function missingSecretNames(env: Record<string, string | undefined>, names: readonly string[]): string[] {
  return names.filter((name) => !env[name]?.trim());
}

const REQUIRED_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export function missingRequiredSecretNames(env: Record<string, string | undefined>): string[] {
  return missingSecretNames(env, REQUIRED_NAMES);
}
