export const DAILY_VIDEO_QUOTA_STATUSES = [
  "pending",
  "processing",
  "retry_wait",
  "completed",
] as const;

const dailyVideoQuotaStatuses = new Set<string>(DAILY_VIDEO_QUOTA_STATUSES);

export type DailyVideoQuotaRow = {
  status?: unknown;
  automation_key?: unknown;
};

/**
 * Count only requests that are still active/retryable or have completed.
 * Terminal failed/cancelled requests do not satisfy the daily delivery target,
 * but their slot keys remain reserved so a replacement never reuses an old key.
 */
export function calculateDailyVideoQuotaState(
  rows: readonly DailyVideoQuotaRow[] | null | undefined,
): { reservedCount: number; nextSlot: number } {
  let reservedCount = 0;
  let nextSlot = 0;

  for (const row of rows ?? []) {
    if (typeof row.status === "string" && dailyVideoQuotaStatuses.has(row.status)) {
      reservedCount += 1;
    }

    if (typeof row.automation_key !== "string") continue;
    const match = row.automation_key.match(/:(\d+)$/);
    if (!match) continue;

    const slot = Number(match[1]);
    if (Number.isSafeInteger(slot) && slot >= 0) {
      nextSlot = Math.max(nextSlot, slot + 1);
    }
  }

  return { reservedCount, nextSlot };
}


export type ZonedDailyVideoQuotaWindow = {
  dayIndex: number;
  localDate: string;
  startIso: string;
  nextStartIso: string;
  timeZone: string;
  localHour: number;
};

function datePartsForZone(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function firstInstantOfLocalDate(localDate: string, timeZone: string, formatter: Intl.DateTimeFormat): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new Error("A valid ISO local date is required for the video quota window.");
  const targetOrdinal = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let low = targetOrdinal - 3 * 86_400_000;
  let high = targetOrdinal + 3 * 86_400_000;
  const keyAt = (instant: number) => {
    const parts = datePartsForZone(new Date(instant), formatter);
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  if (keyAt(low) >= localDate || keyAt(high) < localDate) {
    throw new Error("Could not bracket the requested local video quota day.");
  }
  // Binary search the first instant whose zoned calendar date is this day.
  // This also handles time-zone transitions that skip or repeat local midnight.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (keyAt(middle) < localDate) low = middle;
    else high = middle;
  }
  if (keyAt(high) !== localDate) {
    throw new Error("The requested local video quota date does not exist in this time zone.");
  }
  return new Date(high);
}

/** Resolve one complete local calendar day to UTC bounds for daily video quotas. */
export function resolveZonedDailyVideoQuotaWindow(
  now: Date,
  timeZone = "Africa/Cairo",
): ZonedDailyVideoQuotaWindow {
  if (!Number.isFinite(now.getTime())) throw new Error("A valid current time is required for the daily video quota.");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = datePartsForZone(now, formatter);
  if (!parts.year || !parts.month || !parts.day) {
    throw new Error("Could not resolve the current local date for the daily video quota.");
  }
  const clockParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const localHour = Number(clockParts.find((part) => part.type === "hour")?.value);
  if (!Number.isInteger(localHour) || localHour < 0 || localHour > 23) {
    throw new Error("Could not resolve the current local hour for the daily video quota.");
  }
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const start = firstInstantOfLocalDate(localDate, timeZone, formatter);
  const nextCalendarDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1));
  const nextLocalDate = [
    nextCalendarDate.getUTCFullYear().toString().padStart(4, "0"),
    (nextCalendarDate.getUTCMonth() + 1).toString().padStart(2, "0"),
    nextCalendarDate.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
  const nextStart = firstInstantOfLocalDate(nextLocalDate, timeZone, formatter);
  if (nextStart.getTime() <= start.getTime()) {
    throw new Error("The daily video quota window is not increasing.");
  }
  return {
    dayIndex: Math.floor(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000),
    localDate,
    startIso: start.toISOString(),
    nextStartIso: nextStart.toISOString(),
    timeZone,
    localHour,
  };
}
