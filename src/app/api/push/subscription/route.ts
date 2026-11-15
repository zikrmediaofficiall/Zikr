import { NextRequest, NextResponse } from "next/server";
import {
  normalizePushSubscriptionRequestBody,
  parsePushCoordinate,
  parsePushSubscriptionRequestBody,
} from "@/features/notifications/services/push-subscription-request";
import { resolvePushSubscriptionWritePlan } from "@/features/notifications/services/push-subscription-ownership";
import { mergePrayerReminderPreferences } from "@/features/prayer/services/prayer-reminder-preferences";
import {
  createAdminClient,
  createClient,
  getSupabaseUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { readBoundedJsonBody } from "@/lib/request/bounded-json-body";

export const dynamic = "force-dynamic";

const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  deviceId?: unknown;
  userAgent?: unknown;
  platform?: unknown;
  prayerContext?: {
    location?: {
      latitude?: unknown;
      longitude?: unknown;
      city?: unknown;
      country?: unknown;
      timezone?: unknown;
    };
    prayerReminders?: unknown;
  };
};

function asBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function validTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}


function parsePrayerContext(body: SubscriptionBody) {
  const location = body.prayerContext?.location;
  const city = asBoundedString(location?.city, 256);
  const timezone = asBoundedString(location?.timezone, 128);
  const latitude = parsePushCoordinate(location?.latitude, -90, 90);
  const longitude = parsePushCoordinate(location?.longitude, -180, 180);
  if (
    !city ||
    !timezone ||
    !validTimezone(timezone) ||
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const rawReminders = body.prayerContext?.prayerReminders;
  if (
    !rawReminders ||
    typeof rawReminders !== "object" ||
    Array.isArray(rawReminders)
  ) {
    return null;
  }

  const prayerReminders: Record<string, number | null> = {};
  for (const prayer of PRAYER_NAMES) {
    const value = (rawReminders as Record<string, unknown>)[prayer];
    if (value === null) {
      prayerReminders[prayer] = null;
      continue;
    }
    if (!Number.isInteger(value) || Number(value) < -60 || Number(value) > 60)
      return null;
    prayerReminders[prayer] = Number(value);
  }

  return {
    location: {
      city,
      country: asBoundedString(location?.country, 256),
      latitude,
      longitude,
      timezone,
    },
    prayerReminders,
  };
}

async function requireUser() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseUser();
}

async function upsertPrayerContext(
  admin: ReturnType<typeof createAdminClient>,
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  context: NonNullable<ReturnType<typeof parsePrayerContext>>
) {
  const { data: existingPreferences, error: preferenceLookupError } = await admin
    .from("prayer_preferences")
    .select("prayer_reminders")
    .eq("user_id", userId)
    .maybeSingle();
  if (preferenceLookupError) throw preferenceLookupError;

  const mergedPrayerReminders = mergePrayerReminderPreferences(
    existingPreferences?.prayer_reminders,
    context.prayerReminders
  );

  const { data: savedLocation, error: locationError } = await userClient
    .rpc("save_default_prayer_location", {
      p_city: context.location.city,
      p_country: context.location.country,
      p_latitude: context.location.latitude,
      p_longitude: context.location.longitude,
      p_timezone: context.location.timezone,
    })
    .single();

  if (locationError || !savedLocation) {
    throw locationError ?? new Error("Failed to save the default prayer location.");
  }

  const { error: preferenceError } = await admin
    .from("prayer_preferences")
    .upsert(
      {
        user_id: userId,
        prayer_reminders: mergedPrayerReminders,
        notifications_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (preferenceError) throw preferenceError;
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsedBody = await readBoundedJsonBody(request, 16 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const body = normalizePushSubscriptionRequestBody(parsedBody.value) as SubscriptionBody;
  const parsed = parsePushSubscriptionRequestBody(parsedBody.value);
  const prayerContext = parsePrayerContext(body);
  if (!parsed || !prayerContext) {
    return NextResponse.json(
      { error: "Invalid push subscription or prayer settings." },
      { status: 400 }
    );
  }

  try {
    const userClient = await createClient();
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("push_subscriptions")
      .select("id, user_id")
      .eq("endpoint", parsed.endpoint)
      .maybeSingle();
    if (existingError) throw existingError;

    // The lookup is only a preflight. The subsequent update is scoped by the
    // current owner and endpoint, while a concurrent insert is handled as a
    // conflict rather than an upsert that could transfer ownership.
    const writePlan = resolvePushSubscriptionWritePlan(existing, user.id);
    if (writePlan.kind === "conflict") {
      return NextResponse.json(
        { error: "Subscription belongs to a different account." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const subscriptionPatch = {
      p256dh: parsed.p256dh,
      auth: parsed.auth,
      device_id: parsed.device_id,
      user_agent: parsed.user_agent,
      platform: parsed.platform,
      is_active: true,
      last_used_at: now,
      updated_at: now,
    };

    if (writePlan.kind === "update") {
      const { data: updated, error: updateError } = await admin
        .from("push_subscriptions")
        .update(subscriptionPatch)
        .eq("id", writePlan.id)
        .eq("user_id", user.id)
        .eq("endpoint", parsed.endpoint)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updated) {
        return NextResponse.json(
          { error: "Subscription ownership changed; register it again from this account." },
          { status: 409 }
        );
      }
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("push_subscriptions")
        .insert({
          user_id: user.id,
          endpoint: parsed.endpoint,
          ...subscriptionPatch,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        if ((insertError as { code?: string }).code === "23505") {
          return NextResponse.json(
            { error: "Subscription was registered concurrently; retry from this account." },
            { status: 409 }
          );
        }
        throw insertError;
      }
      if (!inserted) throw new Error("Failed to save the push subscription.");
    }

    await upsertPrayerContext(admin, userClient, user.id, prayerContext);
    return NextResponse.json({ ok: true }, { status: writePlan.kind === "insert" ? 201 : 200 });
  } catch (error) {
    console.error("[push] Failed to save subscription:", error);
    return NextResponse.json(
      { error: "Unable to save subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsedBody = await readBoundedJsonBody(request, 16 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const body = normalizePushSubscriptionRequestBody(parsedBody.value);
  const endpoint = asBoundedString(body.endpoint, 4096);
  if (!endpoint)
    return NextResponse.json(
      { error: "Invalid subscription." },
      { status: 400 }
    );

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push] Failed to remove subscription:", error);
    return NextResponse.json(
      { error: "Unable to remove subscription." },
      { status: 500 }
    );
  }
}
