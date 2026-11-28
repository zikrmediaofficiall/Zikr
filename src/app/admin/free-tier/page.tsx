export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { getAdminSettings } from "@/features/admin/services/platform";
import {
  buildFreeTierRows,
  freeTierRegistry,
  readUsageMap,
  summarizeFreeTierRows,
  type FreeTierRow,
  type FreeTierState,
} from "@/features/ops/free-tier-budget";

export const metadata: Metadata = { title: "حدود الخطط المجانية | لوحة الإدارة" };

const STATE_LABELS: Record<FreeTierState, string> = {
  ok: "داخل الحد",
  warn: "قريب من الحد",
  critical: "تجاوز الحد",
  unknown: "غير مسجل",
};

const STATE_STYLES: Record<FreeTierState, string> = {
  ok: "border-emerald-500/20 bg-emerald-500/5 text-emerald-100/80",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-100/85",
  critical: "border-red-500/30 bg-red-500/10 text-red-100/85",
  unknown: "border-brand-gold/10 bg-black/10 text-brand-cream/45",
};

const WINDOW_LABELS: Record<string, string> = {
  second: "لكل ثانية",
  day: "يوميًا",
  week: "أسبوعيًا",
  month: "شهريًا",
  instant: "حد ثابت",
};

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

function UsageBar({ row }: { row: FreeTierRow }) {
  const width = row.percent === null ? 0 : Math.min(100, Math.max(2, row.percent));
  const tone =
    row.state === "critical" ? "bg-red-400/70" : row.state === "warn" ? "bg-amber-400/70" : "bg-emerald-400/60";
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5" aria-hidden="true">
      <div className={`h-full rounded-full ${row.state === "unknown" ? "bg-white/10" : tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function AdminFreeTierPage() {
  await requireAdminPermission("system.manage");

  const settings = await getAdminSettings().catch(() => null);
  const settingsRecord = (settings ?? {}) as Record<string, unknown>;
  const usage = readUsageMap(settingsRecord.free_tier_usage);
  const recordedAt =
    typeof settingsRecord.free_tier_usage_recorded_at === "string" ? settingsRecord.free_tier_usage_recorded_at : null;

  const rows = buildFreeTierRows(usage);
  const totals = summarizeFreeTierRows(rows);
  const attention = rows.filter((row) => row.state === "warn" || row.state === "critical");
  const rules = freeTierRegistry.rules ?? {};

  return (
    <Container className="py-10 space-y-6" dir="rtl">
      <header>
        <p className="text-xs tracking-[0.18em] text-brand-cream/30">حدود الخطط المجانية</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-gold">ميزانية الخطط المجانية</h1>
        <p className="mt-2 text-sm leading-7 text-brand-cream/50">
          كل خدمة مجانية يعتمد عليها المشروع، بحدها الحقيقي من صفحة المزود، وما استُهلك منها، والبديل المجاني لو وصلت للحد.
          الأرقام هنا لا تُخترع: الخدمة التي لم يُسجَّل استهلاكها تظهر «غير مسجل» حتى تُدخل رقمًا حقيقيًا.
        </p>
      </header>

      {attention.length > 0 && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 text-sm leading-7 ${totals.critical > 0 ? STATE_STYLES.critical : STATE_STYLES.warn}`}
        >
          <p className="font-bold">
            {totals.critical > 0
              ? `${totals.critical} خدمة تجاوزت حدها المجاني`
              : `${totals.warn} خدمة بلغت ${freeTierRegistry.alertThresholdPercent}% من حدها`}
          </p>
          <ul className="mt-2 space-y-1">
            {attention.map((row) => (
              <li key={row.service.id}>
                <span className="font-bold">{row.service.labelAr ?? row.service.name}</span> — {formatNumber(row.used)} من{" "}
                {formatNumber(row.limit)} {row.service.unit} ({formatPercent(row.percent)}). البديل: {row.service.fallback || "غير محدد"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-gold/10 bg-black/10 p-4">
          <p className="text-xs text-brand-cream/35">الخدمات المرصودة</p>
          <p className="mt-1 text-2xl font-bold text-brand-gold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-brand-gold/10 bg-black/10 p-4">
          <p className="text-xs text-brand-cream/35">داخل الحد</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200/80">{totals.ok}</p>
        </div>
        <div className="rounded-2xl border border-brand-gold/10 bg-black/10 p-4">
          <p className="text-xs text-brand-cream/35">قريب من الحد أو متجاوز</p>
          <p className="mt-1 text-2xl font-bold text-amber-200/85">{totals.warn + totals.critical}</p>
        </div>
        <div className="rounded-2xl border border-brand-gold/10 bg-black/10 p-4">
          <p className="text-xs text-brand-cream/35">غير مسجل</p>
          <p className="mt-1 text-2xl font-bold text-brand-cream/60">{totals.unknown}</p>
        </div>
      </section>

      <p className="text-xs leading-6 text-brand-cream/35">
        آخر تسجيل للاستهلاك: {recordedAt ?? "لا يوجد تسجيل بعد"} · الحدود مأخوذة من صفحات المزودين في{" "}
        {freeTierRegistry.verifiedAt} · وقت المشروع {freeTierRegistry.timezone}
      </p>

      <section className="overflow-x-auto rounded-2xl border border-brand-gold/10">
        <table className="w-full min-w-[860px] text-right text-sm">
          <thead className="bg-black/20 text-xs text-brand-cream/40">
            <tr>
              <th className="px-4 py-3 font-normal">الخدمة</th>
              <th className="px-4 py-3 font-normal">الخطة</th>
              <th className="px-4 py-3 font-normal">المستهلك</th>
              <th className="px-4 py-3 font-normal">الحد</th>
              <th className="px-4 py-3 font-normal">النسبة</th>
              <th className="px-4 py-3 font-normal">الحالة</th>
              <th className="px-4 py-3 font-normal">البديل المجاني</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.service.id} className="border-t border-brand-gold/5 align-top">
                <td className="px-4 py-3">
                  <p className="font-bold text-brand-cream/80">{row.service.labelAr ?? row.service.name}</p>
                  <p className="mt-1 text-xs text-brand-cream/35" dir="ltr">
                    {row.service.metric}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-brand-cream/50" dir="ltr">
                  {row.service.provider} · {row.service.plan}
                </td>
                <td className="px-4 py-3 text-brand-cream/70">
                  {formatNumber(row.used)} <span className="text-xs text-brand-cream/35">{row.service.unit}</span>
                </td>
                <td className="px-4 py-3 text-brand-cream/70">
                  {formatNumber(row.limit)} <span className="text-xs text-brand-cream/35">{row.service.unit}</span>
                  <p className="mt-1 text-xs text-brand-cream/30">
                    {WINDOW_LABELS[row.service.window] ?? row.service.window}
                    {row.service.selfCap !== undefined ? " · سقفنا الداخلي" : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-brand-cream/70">
                  {formatPercent(row.percent)}
                  <UsageBar row={row} />
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full border px-2 py-1 text-xs ${STATE_STYLES[row.state]}`}>
                    {STATE_LABELS[row.state]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs leading-6 text-brand-cream/45">
                  {row.service.fallback || "—"}
                  <a
                    href={row.service.source}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 block text-brand-gold/60 underline-offset-4 hover:underline"
                    dir="ltr"
                  >
                    المصدر
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-brand-gold/10 bg-black/10 p-4 text-sm leading-7 text-brand-cream/55">
        <h2 className="text-base font-bold text-brand-gold">قواعد الاستهلاك</h2>
        <p className="mt-2">
          الفيديو: {String((rules.video ?? {}).dailyVideoLimit ?? "—")} فيديو يوميًا، و
          {String((rules.video ?? {}).hfRunsPerDay ?? "—")} تشغيل على Hugging Face، و
          {String((rules.video ?? {}).flowClipsPerDay ?? "—")} مقطع من Flow. عند خطأ حصة من مزود، يُستبعد لبقية اليوم
          وينتقل المسار إلى القالب المحلي.
        </p>
        <p className="mt-1">{String((rules.video ?? {}).upscale ?? "")}</p>
        <p className="mt-1">
          النشر: {String((rules.publishing ?? {}).youtubeUploadsPerDay ?? "—")} رفع يوميًا على يوتيوب مع الاحتفاظ بحصة للفحص.
        </p>
        <p className="mt-1 text-xs text-brand-cream/35">
          لتحديث الأرقام: يُكتب استهلاك كل خدمة في إعداد <span dir="ltr">free_tier_usage</span> بصيغة JSON، وتُقرأ هنا.
          ويمكن تشغيل التقرير من الطرفية: <span dir="ltr">node scripts/free-tier-budget.mjs --usage usage.json</span>
        </p>
      </section>
    </Container>
  );
}
