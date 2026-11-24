export const VIDEO_PUBLISH_TIME_ZONE = "Africa/Cairo";
export const VIDEO_PUBLISH_SLOTS = [
  { hour: 12, minute: 45 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 15 },
] as const;
export const VIDEO_PUBLISH_DAILY_PLATFORM_LIMIT = VIDEO_PUBLISH_SLOTS.length;
const SLOT_MATCH_TOLERANCE_MS = 90 * 60 * 1000;
const VALID_TARGETS = new Set(["youtube", "facebook_reels", "facebook"]);

export type VideoPublishScheduleRow = {
  id?: string;
  status: string;
  target_platforms: string[] | null;
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

function rowReservationTime(row: VideoPublishScheduleRow): Date | null {
  const candidate = row.status === "published"
    ? row.published_at ?? row.scheduled_at ?? row.created_at
    : row.scheduled_at ?? row.published_at ?? row.created_at;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
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

  const reserved = new Set<string>();
  for (const row of input.rows) {
    if (!["queued", "partial", "processing", "published"].includes(row.status)) continue;
    const at = rowReservationTime(row);
    if (!at) continue;
    const slotIndex = nearestSlotIndex(at);
    if (slotIndex === null) continue;
    const key = cairoDateKey(at) + ":" + slotIndex;
    for (const platform of row.target_platforms ?? []) {
      if (VALID_TARGETS.has(platform)) reserved.add(platform + ":" + key);
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
      const key = dayKey + ":" + slotIndex;
      if (platforms.every((platform) => !reserved.has(platform + ":" + key))) return instant.toISOString();
    }
  }
  return null;
}
