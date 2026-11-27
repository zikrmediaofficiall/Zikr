export const VIDEO_PUBLISH_TIME_ZONE = "Africa/Cairo";
export const VIDEO_PUBLISH_SLOTS = [
  // Two posts a day (cut from three on 2026-11-26) in the afternoon/evening windows, aligned with the
  // publisher's :07/:22/:37/:52 cron. The 05:37 slot was dropped to reduce repetitive output.
  { hour: 14, minute: 22 },
  { hour: 17, minute: 52 },
] as const;
export const VIDEO_PUBLISH_DAILY_PLATFORM_LIMIT = VIDEO_PUBLISH_SLOTS.length;
const SLOT_MATCH_TOLERANCE_MS = 90 * 60 * 1000;
const VALID_TARGETS = new Set(["youtube", "facebook_reels", "facebook"]);

export type VideoPublishScheduleRow = {
  id?: string;
  status: string;
  target_platforms: string[] | null;
  completed_platforms?: string[];
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
};

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
const cairoFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VIDEO_PUBLISH_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function zonedParts(value: Date): ZonedParts {
  const values = Object.fromEntries(cairoFormatter.formatToParts(value).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

function localDateParts(value: Date, dayOffset = 0) {
  const current = zonedParts(value);
  const shifted = new Date(Date.UTC(current.year, current.month - 1, current.day + dayOffset));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function cairoLocalTimeToUtc(parts: { year: number; month: number; day: number; hour: number; minute: number }): Date {
  const desiredWallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = desiredWallClock;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const observed = zonedParts(new Date(candidate));
    const observedWallClock = Date.UTC(
      observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second,
    );
    const correction = desiredWallClock - observedWallClock;
    if (correction === 0) break;
    candidate += correction;
  }
  return new Date(candidate);
}

function cairoDateKey(value: Date): string {
  const parts = zonedParts(value);
  return [String(parts.year).padStart(4, "0"), String(parts.month).padStart(2, "0"), String(parts.day).padStart(2, "0")].join("-");
}

function nearestSlotIndex(value: Date): number | null {
  const parts = zonedParts(value);
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < VIDEO_PUBLISH_SLOTS.length; index += 1) {
    const slot = VIDEO_PUBLISH_SLOTS[index];
    const scheduled = cairoLocalTimeToUtc({ ...parts, hour: slot.hour, minute: slot.minute });
    const distance = Math.abs(scheduled.getTime() - value.getTime());
    if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
  }
  return nearestDistance <= SLOT_MATCH_TOLERANCE_MS ? nearestIndex : null;
}

function rowReservationTime(row: VideoPublishScheduleRow, platformCompleted: boolean): Date | null {
  const candidate = platformCompleted || row.status === "published"
    ? row.published_at ?? row.scheduled_at ?? row.created_at
    : row.scheduled_at ?? row.published_at ?? row.created_at;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function completedPlatformsForRow(row: VideoPublishScheduleRow): Set<string> {
  return new Set(row.status === "published"
    ? row.target_platforms ?? []
    : row.completed_platforms ?? []);
}

export function resolveNextVideoPublishAt(input: {
  now?: Date;
  rows: readonly VideoPublishScheduleRow[];
  targetPlatforms: readonly string[];
  minimumLeadMinutes?: number;
  searchDays?: number;
}): string | null {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime()) || input.targetPlatforms.length === 0) return null;
  const platforms = [...new Set(input.targetPlatforms)];
  if (platforms.some((platform) => !VALID_TARGETS.has(platform))) return null;

  const reservedSlots = new Set<string>();
  const dailyPlatformCounts = new Map<string, number>();
  for (const row of input.rows) {
    if (!["queued", "partial", "processing", "published"].includes(row.status)) continue;
    const completedPlatforms = completedPlatformsForRow(row);
    for (const platform of row.target_platforms ?? []) {
      if (!VALID_TARGETS.has(platform)) continue;
      // A partial delivery consumes its completed platform's quota at the
      // confirmed publish time, but only its remaining targets reserve the
      // retry/scheduled slot. This avoids throttling YouTube while Reels waits.
      const at = rowReservationTime(row, completedPlatforms.has(platform));
      if (!at) continue;
      const dayKey = cairoDateKey(at);
      const slotIndex = nearestSlotIndex(at);
      const dailyKey = platform + ":" + dayKey;
      dailyPlatformCounts.set(dailyKey, (dailyPlatformCounts.get(dailyKey) ?? 0) + 1);
      if (slotIndex !== null) reservedSlots.add(platform + ":" + dayKey + ":" + slotIndex);
    }
  }

  const leadMs = Math.max(0, input.minimumLeadMinutes ?? 15) * 60_000;
  const searchDays = Math.max(1, Math.min(60, Math.floor(input.searchDays ?? 31)));
  const earliest = now.getTime() + leadMs;
  for (let dayOffset = 0; dayOffset < searchDays; dayOffset += 1) {
    const localDate = localDateParts(now, dayOffset);
    const dayKey = [
      String(localDate.year).padStart(4, "0"),
      String(localDate.month).padStart(2, "0"),
      String(localDate.day).padStart(2, "0"),
    ].join("-");
    for (let slotIndex = 0; slotIndex < VIDEO_PUBLISH_SLOTS.length; slotIndex += 1) {
      const slot = VIDEO_PUBLISH_SLOTS[slotIndex];
      const instant = cairoLocalTimeToUtc({ ...localDate, hour: slot.hour, minute: slot.minute });
      if (instant.getTime() < earliest) continue;
      const slotKey = dayKey + ":" + slotIndex;
      const underDailyLimit = platforms.every((platform) =>
        (dailyPlatformCounts.get(platform + ":" + dayKey) ?? 0) < VIDEO_PUBLISH_DAILY_PLATFORM_LIMIT,
      );
      if (underDailyLimit && platforms.every((platform) => !reservedSlots.has(platform + ":" + slotKey))) {
        return instant.toISOString();
      }
    }
  }
  return null;
}


/** Reserve a fixed weekly campaign slot without bypassing platform pacing or its daily cap. */
export function canReserveVideoPublishAt(input: {
  scheduledAt: string | Date;
  now?: Date;
  rows: readonly VideoPublishScheduleRow[];
  targetPlatforms: readonly string[];
  minimumLeadMinutes?: number;
}): boolean {
  const now = input.now ?? new Date();
  const scheduled = input.scheduledAt instanceof Date ? input.scheduledAt : new Date(input.scheduledAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(scheduled.getTime())) return false;
  const platforms = [...new Set(input.targetPlatforms)];
  if (platforms.length === 0 || platforms.some((platform) => !VALID_TARGETS.has(platform))) return false;
  const leadMs = Math.max(0, input.minimumLeadMinutes ?? 15) * 60_000;
  if (scheduled.getTime() < now.getTime() + leadMs) return false;

  const dayKey = cairoDateKey(scheduled);
  const candidateSlot = nearestSlotIndex(scheduled);
  const dailyCounts = new Map<string, number>();
  const occupiedPlatforms = new Set<string>();
  for (const row of input.rows) {
    if (!["queued", "partial", "processing", "published"].includes(row.status)) continue;
    const completedPlatforms = completedPlatformsForRow(row);
    for (const platform of row.target_platforms ?? []) {
      if (!VALID_TARGETS.has(platform)) continue;
      const at = rowReservationTime(row, completedPlatforms.has(platform));
      if (!at || cairoDateKey(at) !== dayKey) continue;
      const sameWindow = Math.abs(at.getTime() - scheduled.getTime()) < SLOT_MATCH_TOLERANCE_MS;
      const slotIndex = nearestSlotIndex(at);
      dailyCounts.set(platform, (dailyCounts.get(platform) ?? 0) + 1);
      if (sameWindow || (candidateSlot !== null && slotIndex === candidateSlot)) occupiedPlatforms.add(platform);
    }
  }
  return platforms.every((platform) =>
    (dailyCounts.get(platform) ?? 0) < VIDEO_PUBLISH_DAILY_PLATFORM_LIMIT &&
    !occupiedPlatforms.has(platform),
  );
}


/**
 * How long a scheduled slot stays claimable by the publisher. A row whose slot just arrived must be
 * published, not re-slotted. Only rows left overdue for longer than this (historical or stuck) are
 * moved to a fresh slot.
 */
export const VIDEO_SLOT_CLAIM_GRACE_MS = 6 * 60 * 60 * 1000;

export function shouldRebalanceDueVideoRow(scheduledAt: string | null | undefined, now: Date): boolean {
  if (!scheduledAt) return true;
  const due = Date.parse(scheduledAt);
  if (!Number.isFinite(due)) return true;
  if (due > now.getTime()) return false;
  return now.getTime() - due > VIDEO_SLOT_CLAIM_GRACE_MS;
}
