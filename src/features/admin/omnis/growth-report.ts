/**
 * OMNIS P09-02/03: pure aggregation for the growth report. Counts of people are suppressed below a
 * minimum cohort size; revenue is never invented: with no connected revenue source both figures are null.
 */
export const MIN_COHORT = 10;

export type InsightRow = { queue_id: string; platform: string; metrics: unknown; captured_at: string };
export type PlatformTotals = { platform: string; posts: number; views: number; likes: number; comments: number };
export type WeekPoint = { week: string; posts: number; views: number };

const num = (metrics: unknown, key: string): number => {
  const v = metrics && typeof metrics === "object" ? (metrics as Record<string, unknown>)[key] : undefined;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
};

/** Keeps only the newest snapshot per post and platform, so repeated syncs never double count. */
export function latestSnapshots(rows: readonly InsightRow[]): InsightRow[] {
  const latest = new Map<string, InsightRow>();
  for (const row of rows) {
    const key = `${row.queue_id}|${row.platform}`;
    const existing = latest.get(key);
    if (!existing || row.captured_at > existing.captured_at) latest.set(key, row);
  }
  return [...latest.values()];
}

export function totalsByPlatform(rows: readonly InsightRow[]): PlatformTotals[] {
  const map = new Map<string, PlatformTotals>();
  for (const row of latestSnapshots(rows)) {
    const t = map.get(row.platform) ?? { platform: row.platform, posts: 0, views: 0, likes: 0, comments: 0 };
    t.posts += 1;
    t.views += num(row.metrics, "views");
    t.likes += num(row.metrics, "likes");
    t.comments += num(row.metrics, "comments");
    map.set(row.platform, t);
  }
  return [...map.values()].sort((a, b) => b.views - a.views);
}

/** ISO week start (Monday, UTC) as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function weeklyTrend(rows: readonly InsightRow[], weeks = 8): WeekPoint[] {
  const map = new Map<string, WeekPoint>();
  for (const row of latestSnapshots(rows)) {
    const week = weekStart(row.captured_at);
    const p = map.get(week) ?? { week, posts: 0, views: 0 };
    p.posts += 1;
    p.views += num(row.metrics, "views");
    map.set(week, p);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-weeks);
}

/** Audience counts below the minimum cohort are reported as null (hidden), never as small numbers. */
export function suppressSmallCohorts(counts: Record<string, number>, min = MIN_COHORT): Record<string, number | null> {
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v >= min ? v : null]));
}

export type RevenueReport = { actual: number | null; estimated: number | null; note: string };
export function revenueReport(source: { actual?: number | null; estimated?: number | null } | null): RevenueReport {
  if (!source || (source.actual == null && source.estimated == null)) {
    return { actual: null, estimated: null, note: "لا يوجد مصدر إيرادات متصل (AdSense أو YouTube Partner). لا تُعرض أرقام تقديرية مختلقة." };
  }
  return { actual: source.actual ?? null, estimated: source.estimated ?? null, note: "الفعلي والتقديري منفصلان." };
}

// P09-03: owner-entered monthly revenue (no automatic AdSense/YouTube feed exists).
export const MANUAL_REVENUE_KEY = "revenue_manual";
export type ManualRevenueMonth = { month: string; actual: number | null; estimated: number | null; currency: string };

const moneyNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9 ? Math.round(v * 100) / 100 : null);

export function parseManualRevenue(raw: unknown): ManualRevenueMonth[] {
  const months = raw && typeof raw === "object" ? (raw as { months?: unknown }).months : null;
  if (!months || typeof months !== "object") return [];
  const out: ManualRevenueMonth[] = [];
  for (const [month, v] of Object.entries(months as Record<string, unknown>)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const actual = moneyNum(r.actual);
    const estimated = moneyNum(r.estimated);
    if (actual == null && estimated == null) continue;
    out.push({ month, actual, estimated, currency: typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency) ? r.currency : "USD" });
  }
  return out.sort((a, b) => b.month.localeCompare(a.month));
}

/** Totals never mix actual and estimated, nor currencies. */
export function manualRevenueTotals(rows: ManualRevenueMonth[]): Record<string, { actual: number; estimated: number }> {
  const out: Record<string, { actual: number; estimated: number }> = {};
  for (const r of rows) {
    const t = (out[r.currency] ??= { actual: 0, estimated: 0 });
    t.actual = Math.round((t.actual + (r.actual ?? 0)) * 100) / 100;
    t.estimated = Math.round((t.estimated + (r.estimated ?? 0)) * 100) / 100;
  }
  return out;
}
