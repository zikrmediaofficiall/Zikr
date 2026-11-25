import Link from "next/link";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

type WorkerRun = { status?: string; runId?: string; runUrl?: string; at?: string; event?: string };

/** The scheduled worker runs every 6 hours; a gap longer than this means it is broken or not starting. */
const STALE_AFTER_HOURS = 14;

async function safeRows<T>(path: string): Promise<T[] | null> {
  try {
    return (await supabaseServerAdminRequest<T[]>(path, { method: "GET" })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Makes a broken video worker visible on the admin dashboard and the automation page.
 * It combines the outcome the GitHub workflow records (admin_settings.video_worker_last_run)
 * with the last time the worker actually processed the queue (video_automation_runs).
 */
export async function VideoWorkerHealthBanner() {
  const [settingRows, runRows] = await Promise.all([
    safeRows<{ value: WorkerRun }>("/rest/v1/admin_settings?key=eq.video_worker_last_run&select=value&limit=1"),
    safeRows<{ finished_at: string | null }>("/rest/v1/video_automation_runs?select=finished_at&order=finished_at.desc.nullslast&limit=1"),
  ]);
  if (settingRows === null && runRows === null) return null;

  const last = settingRows?.[0]?.value ?? null;
  const lastFinished = runRows?.[0]?.finished_at ?? null;
  const hoursSince = lastFinished ? (Date.now() - new Date(lastFinished).getTime()) / 3_600_000 : null;
  const failed = last?.status === "failure" || last?.status === "cancelled";
  const stale = hoursSince !== null && hoursSince > STALE_AFTER_HOURS;
  if (!failed && !stale) return null;

  return (
    <div role="alert" dir="rtl" className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm leading-7 text-red-100">
      <p className="font-bold">تنبيه: عامل توليد الفيديو متعطل</p>
      <p className="mt-1 text-red-100/80">
        {failed
          ? `آخر تشغيل في GitHub Actions انتهى بحالة «${last?.status === "cancelled" ? "ملغى" : "فشل"}»${last?.at ? ` بتاريخ ${new Date(last.at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}` : ""}.`
          : null}{" "}
        {stale && lastFinished
          ? `آخر معالجة فعلية للطابور كانت قبل ${Math.floor(hoursSince ?? 0)} ساعة (الحد المتوقع ${STALE_AFTER_HOURS} ساعة).`
          : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {last?.runUrl && /^https:\/\/github\.com\//.test(last.runUrl) ? (
          <a href={last.runUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs hover:bg-red-500/10">
            فتح سجل التشغيل في GitHub
          </a>
        ) : null}
        <Link href="/admin/automation" className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs hover:bg-red-500/10">
          صفحة الأتمتة
        </Link>
      </div>
    </div>
  );
}
