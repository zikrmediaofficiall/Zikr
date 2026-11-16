import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  hasEnabledPrayerReminder,
  mergePrayerReminderPreferences,
} from "../../src/features/prayer/services/prayer-reminder-preferences";

const requested = {
  Fajr: 0,
  Dhuhr: 0,
  Asr: null,
  Maghrib: 0,
  Isha: 0,
};

assert.deepEqual(
  mergePrayerReminderPreferences(
    { Fajr: -10, Dhuhr: 5, Asr: 15, Maghrib: 99, Isha: null, retired: 20 },
    requested,
  ),
  { Fajr: -10, Dhuhr: 5, Asr: null, Maghrib: 0, Isha: 0 },
  "push refresh must preserve valid offsets for enabled prayers, apply disabled flags, and reject invalid legacy offsets",
);

assert.deepEqual(
  mergePrayerReminderPreferences(null, requested),
  requested,
  "first-time registration must use the requested enabled/disabled flags",
);

assert.deepEqual(
  mergePrayerReminderPreferences(["not", "a", "record"], requested),
  requested,
  "malformed stored JSON must not be treated as a prayer preference record",
);

assert.equal(
  hasEnabledPrayerReminder({ Fajr: -10, Dhuhr: null }),
  true,
  "a valid numeric offset represents an enabled prayer reminder",
);
assert.equal(
  hasEnabledPrayerReminder({ Fajr: null, Dhuhr: null }),
  false,
  "null offsets represent disabled prayer reminders",
);

const route = readFileSync("src/app/api/push/subscription/route.ts", "utf8");
const lookupIndex = route.indexOf('.from("prayer_preferences")');
const mergeIndex = route.indexOf("mergePrayerReminderPreferences(");
const upsertIndex = route.indexOf('.upsert(', lookupIndex);
assert.ok(
  lookupIndex >= 0 && mergeIndex > lookupIndex && upsertIndex > mergeIndex,
  "the subscription route must read and merge saved offsets before writing prayer preferences",
);
assert.match(route, /\.select\("prayer_reminders"\)/);
assert.match(route, /prayer_reminders:\s*mergedPrayerReminders/);

console.log("Prayer reminder preference merge contract passed.");


const timezoneGuardMigration = readFileSync(
  "supabase/migrations/20261116150000_enforce_background_reminder_timezone.sql",
  "utf8",
);
assert.match(
  timezoneGuardMigration,
  /CREATE TRIGGER background_reminder_preferences_timezone_guard[\s\S]*?BEFORE INSERT OR UPDATE OF timezone/i,
  "the database must validate time zones for both new preferences and timezone updates",
);
assert.match(
  timezoneGuardMigration,
  /pg_catalog\.pg_timezone_names/,
  "the database guard must validate against PostgreSQL's installed IANA timezone catalog",
);
assert.match(
  timezoneGuardMigration,
  /ERRCODE\s*=\s*'22023'/,
  "invalid direct database writes must return a stable invalid-parameter SQLSTATE",
);
assert.match(
  timezoneGuardMigration,
  /SECURITY INVOKER[\s\S]*?SET search_path\s*=\s*''/i,
  "the trigger function must remain invoker-scoped with an empty search path",
);
assert.match(
  timezoneGuardMigration,
  /REVOKE ALL ON FUNCTION private\.enforce_background_reminder_timezone\(\)\s+FROM PUBLIC, anon, authenticated[\s\S]*?GRANT EXECUTE ON FUNCTION private\.enforce_background_reminder_timezone\(\) TO authenticated, service_role/i,
  "only authenticated and service_role may execute the non-RPC trigger function",
);
const reminderService = readFileSync("src/features/reminders/services/reminder-preferences.ts", "utf8");
assert.match(
  reminderService,
  /normalizeIanaTimeZone\(body\.timezone\)/,
  "the application API must retain its existing IANA timezone validation",
);
const reminderIntegration = readFileSync("scripts/tests/background-reminder-schedule.integration.sql", "utf8");
assert.match(reminderIntegration, /Not\/A_Real_Time_Zone/);
const reminderRunner = readFileSync("scripts/tests/background-reminder-schedule.integration.sh", "utf8");
assert.ok(
  reminderRunner.includes("20261116150000_enforce_background_reminder_timezone.sql"),
  "the PostgreSQL integration runner must apply the timezone guard migration",
);

console.log("Background reminder database timezone guard contract passed.");
