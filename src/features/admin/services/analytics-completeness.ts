export const ANALYTICS_ROW_LIMITS = { pageViews: 500, auditEvents: 500, videoRequests: 1000 } as const;

/** A query that returned exactly its row limit may have more rows: its totals are lower bounds. */
export function isTruncated(rowCount: number, limit: number): boolean {
  return rowCount >= limit;
}

export function partialSources(input: {
  pageViews: { ok: boolean; count: number };
  auditEvents: { ok: boolean; count: number };
  videoRequests: { ok: boolean; count: number };
}): string[] {
  const partial: string[] = [];
  if (input.pageViews.ok && isTruncated(input.pageViews.count, ANALYTICS_ROW_LIMITS.pageViews)) partial.push("زيارات لوحة التحكم");
  if (input.auditEvents.ok && isTruncated(input.auditEvents.count, ANALYTICS_ROW_LIMITS.auditEvents)) partial.push("نشاط الإدارة");
  if (input.videoRequests.ok && isTruncated(input.videoRequests.count, ANALYTICS_ROW_LIMITS.videoRequests)) partial.push("أداء القوالب البصرية");
  return partial;
}
