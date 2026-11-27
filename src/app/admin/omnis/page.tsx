export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { hasAdminPermission } from "@/features/admin/services/permissions";
import { OMNIS_CENTERS, OMNIS_CENTER_STATUS_LABELS } from "@/features/admin/omnis/registry";
import { OMNIS_EXECUTION_PHASES, OMNIS_TASK_STATE_LABELS, OMNIS_TASK_STATE_STYLES } from "@/features/admin/omnis/plan";
import { getOmnisExecutionSnapshot } from "@/features/admin/services/omnis";
import { getOmnisModuleStatusSnapshot } from "@/features/admin/services/omnis-module-status";
import {
  OMNIS_OPERATIONAL_STATE_LABELS,
  OMNIS_OPERATIONAL_STATE_STYLES,
} from "@/features/admin/omnis/module-status";
import { updateOmnisExecutionTaskAction } from "./actions";
import { updateOmnisIncidentLifecycleAction } from "./actions";
import { runOmnisSafeCommandAction } from "./actions";
import { OMNIS_INCIDENT_SEVERITY_LABELS, OMNIS_INCIDENT_STATE_LABELS, getOmnisModuleLabel } from "@/features/admin/omnis/incidents";
import { canResolveOmnisIncident, OMNIS_INCIDENT_LIFECYCLE_LABELS } from "@/features/admin/omnis/incident-lifecycle";

export const metadata: Metadata = {
  title: "ZIKR OMNIS | مركز القيادة والتحكم",
  description: "مركز القيادة وسجل التنفيذ الموحد لمنصة ذِكرٌ",
};

const STATE_LABELS = OMNIS_TASK_STATE_LABELS as Record<string, string>;
const STATE_STYLES = OMNIS_TASK_STATE_STYLES as Record<string, string>;

export default async function AdminOmnisPage() {
  const profile = await requireAdminPermission("system.manage");
  const [snapshot, moduleStatusSnapshot] = await Promise.all([
    getOmnisExecutionSnapshot(),
    getOmnisModuleStatusSnapshot(),
  ]);
  const moduleStatusById = new Map(moduleStatusSnapshot.modules.map((item) => [item.moduleId, item]));
  const globalOperationalDependencies = moduleStatusById.get("global-command")?.dependencies ?? [];
  const canManage = hasAdminPermission(profile.role, "system.manage");
  const completed = snapshot.items.filter((item) => item.state === "completed").length;
  const inProgress = snapshot.items.filter((item) => item.state === "in_progress").length;
  const blocked = snapshot.items.filter((item) => item.state === "blocked").length;
  const pending = snapshot.items.filter((item) => item.state === "pending").length;
  const live = OMNIS_CENTERS.filter((center) => center.status === "active").length;
  const partial = OMNIS_CENTERS.filter((center) => center.status === "partial").length;
  const planned = OMNIS_CENTERS.filter((center) => center.status === "planned").length;
  const latestIncidentEvents = new Map<string, (typeof moduleStatusSnapshot.incidentEvents)[number]>();
  for (const event of moduleStatusSnapshot.incidentEvents) {
    if (!latestIncidentEvents.has(event.incidentKey)) latestIncidentEvents.set(event.incidentKey, event);
  }

  return (
    <Container className="space-y-8 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">OMNIS Control Plane</span>
          <span className="rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 text-xs text-brand-gold">30 مركزًا في السجل المعماري</span>
        </div>
        <h1 className="text-3xl font-bold text-brand-gold md:text-4xl">ZIKR OMNIS</h1>
        <p className="max-w-4xl text-sm leading-8 text-brand-cream/60">
          مركز القيادة وسجل التنفيذ الموحد. يوضح ما هو قائم بالفعل، وما هو متكامل جزئيًا، وما زال ضمن خطة البناء. لا تُعرض أي وحدة مخططة على أنها مكتملة.
        </p>
        <p className="text-xs text-brand-cream/35" dir="ltr">Branch: main</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-brand-gold/10 bg-black/15 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-brand-gold">الحالة التشغيلية الموحدة</h2>
            <p className="mt-1 text-xs leading-6 text-brand-cream/45">فحوص مباشرة من Supabase وGitHub والطوابير وحالة Vercel المنشورة في Commit Status؛ كل نتيجة تعرض مصدرها ووقت فحصها.</p>
          </div>
          <p className="text-[11px] text-brand-cream/30" dir="ltr">Last probe: {new Date(moduleStatusSnapshot.checkedAt).toLocaleString("en-GB")}</p>
        </div>
        {!moduleStatusSnapshot.available ? (
          <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-6 text-amber-100/80">
            {moduleStatusSnapshot.error ?? "تعذر جمع الحالة التشغيلية؛ تُعرض المصادر غير المقاسة كغير معروفة."}
          </div>
        ) : null}
        {globalOperationalDependencies.length === 0 ? (
          <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/80">لم تُرجع خريطة الاعتماديات مصادر تشغيلية لمركز القيادة.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {globalOperationalDependencies.map((dependency) => (
              <article key={dependency.dependencyId} className="min-w-0 space-y-2 rounded-xl border border-brand-gold/10 bg-black/15 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold leading-5 text-brand-cream/80">{dependency.label}</h3>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${OMNIS_OPERATIONAL_STATE_STYLES[dependency.state]}`}>
                    {OMNIS_OPERATIONAL_STATE_LABELS[dependency.state]}
                  </span>
                </div>
                <p className="min-h-12 text-[11px] leading-5 text-brand-cream/50">{dependency.summary}</p>
                <p className="break-words text-[10px] leading-4 text-brand-gold/55">{dependency.source ?? "المصدر غير متاح"}</p>
                <div className="flex items-center justify-between gap-2 border-t border-brand-gold/10 pt-2 text-[10px] text-brand-cream/30">
                  <span>{dependency.freshness === "fresh" ? "فحص حديث" : dependency.freshness === "stale" ? "الفحص قديم" : "لم يتم الفحص"}</span>
                  <span dir="ltr">{dependency.checkedAt ? new Date(dependency.checkedAt).toLocaleTimeString("en-GB") : "—"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
        <div className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-brand-gold">التنبيهات والحوادث التشغيلية</h2>
              <p className="mt-1 text-xs leading-6 text-brand-cream/45">تجميع للمشكلات المقاسة حسب الاعتماد ومالك المعالجة والوحدات المتأثرة.</p>
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className="rounded-md border border-red-400/20 px-2 py-1 text-red-200">حرج: {moduleStatusSnapshot.incidentCounts.critical}</span>
              <span className="rounded-md border border-amber-400/20 px-2 py-1 text-amber-200">تحذير: {moduleStatusSnapshot.incidentCounts.warning}</span>
              <span className="rounded-md border border-slate-400/20 px-2 py-1 text-slate-200">معلومة: {moduleStatusSnapshot.incidentCounts.info}</span>
            </div>
          </div>
          {moduleStatusSnapshot.incidents.length === 0 ? (
            <p className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs leading-6 text-emerald-100/75">لا توجد حوادث من الاعتماديات التي تم قياسها في هذا الفحص. الاعتماديات غير الموصولة تظل ظاهرة كغير معروفة في خريطة الوحدات ولا تعتبر سليمة.</p>
          ) : (
            <div className="space-y-2">
              {moduleStatusSnapshot.incidents.slice(0, 12).map((incident) => (
                <article key={incident.incidentKey} className="space-y-2 rounded-xl border border-brand-gold/10 bg-black/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={incident.severity === "critical" ? "rounded-full border border-red-400/20 px-2 py-0.5 text-[10px] text-red-200" : incident.severity === "warning" ? "rounded-full border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200" : "rounded-full border border-slate-400/20 px-2 py-0.5 text-[10px] text-slate-200"}>{OMNIS_INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
                      <span className="text-xs font-semibold text-brand-cream/85">{incident.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-brand-cream/40">{OMNIS_INCIDENT_STATE_LABELS[incident.state]}</span>
                      <span className="rounded-full border border-brand-gold/15 px-2 py-0.5 text-[10px] text-brand-gold/75">{OMNIS_INCIDENT_LIFECYCLE_LABELS[incident.lifecycleState]}</span>
                    </div>
                  </div>
                  <p className="text-xs leading-6 text-brand-cream/55">{incident.summary}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-brand-cream/35">
                    <span>المسؤول: {incident.owner}</span>
                    <span>الوحدات: {incident.affectedModules.map(getOmnisModuleLabel).join("، ")}</span>
                    <span>حداثة الفحص: {incident.freshness === "fresh" ? "حديث" : incident.freshness === "stale" ? "قديم" : "مفقود"}</span>
                    {incident.checkedAt ? <span dir="ltr">{new Date(incident.checkedAt).toLocaleString("en-GB")}</span> : null}
                  </div>
                  {canManage && incident.lifecycleState !== "acknowledged" ? (
                    <form action={updateOmnisIncidentLifecycleAction} className="flex flex-wrap items-center gap-2 border-t border-brand-gold/10 pt-2">
                      <input type="hidden" name="incident_key" value={incident.incidentKey} />
                      <input type="hidden" name="lifecycle_action" value="acknowledged" />
                      <input name="note" maxLength={500} placeholder="ملاحظة الاستلام (اختياري)" className="min-w-0 flex-1 rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-3 py-2 text-[11px] text-brand-cream" />
                      <button type="submit" className="rounded-lg border border-brand-gold/25 bg-brand-gold/10 px-3 py-2 text-[11px] font-semibold text-brand-gold hover:bg-brand-gold/15">إقرار واستلام الحادث</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
          <section className="space-y-3 rounded-xl border border-brand-gold/10 bg-black/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-brand-gold">سجل دورة حياة الحوادث</h3>
              <span className="text-[10px] text-brand-cream/35">سجل إدارة append-only</span>
            </div>
            {!moduleStatusSnapshot.incidentHistoryAvailable ? (
              <p role="alert" className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-6 text-amber-100/80">{moduleStatusSnapshot.incidentHistoryError}</p>
            ) : moduleStatusSnapshot.incidentEvents.length === 0 ? (
              <p className="text-xs leading-6 text-brand-cream/40">لا توجد أحداث إقرار أو إغلاق مسجلة حتى الآن.</p>
            ) : (
              <div className="space-y-2">
                {moduleStatusSnapshot.incidentEvents.slice(0, 12).map((event) => {
                  const isLatest = latestIncidentEvents.get(event.incidentKey)?.id === event.id;
                  const dependencyStatuses = moduleStatusSnapshot.modules
                    .flatMap((moduleStatus) => moduleStatus.dependencies)
                    .filter((dependency) => dependency.dependencyId === event.incidentKey.slice("omnis:".length));
                  const canResolve = event.action === "acknowledged"
                    && isLatest
                    && canResolveOmnisIncident(dependencyStatuses)
                    && !moduleStatusSnapshot.incidents.some((incident) => incident.incidentKey === event.incidentKey);
                  return (
                    <article key={event.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-gold/10 pt-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-brand-cream/75">
                          {event.incidentKey} · {event.action === "acknowledged" ? "تم الإقرار والاستلام" : "تم الإغلاق بعد التعافي"}
                        </p>
                        <p className="text-[10px] text-brand-cream/35" dir="ltr">{new Date(event.createdAt).toLocaleString("en-GB")}</p>
                        {event.note ? <p className="text-[11px] leading-5 text-brand-cream/45">{event.note}</p> : null}
                      </div>
                      {canManage && canResolve ? (
                        <form action={updateOmnisIncidentLifecycleAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="incident_key" value={event.incidentKey} />
                          <input type="hidden" name="lifecycle_action" value="resolved" />
                          <input name="note" maxLength={500} placeholder="ملاحظة الإغلاق (اختياري)" className="min-w-0 rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-2 py-2 text-[10px] text-brand-cream" />
                          <button type="submit" className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-400/15">تأكيد التعافي وإغلاق الحادث</button>
                        </form>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] leading-5 text-brand-cream/30">لا يُغلق الحادث إلا بعد فحص حديث يؤكد سلامة كل الوحدات المرتبطة بالاعتماد. غياب الفحص أو قدمه لا يُعد تعافيًا.</p>
          </section>
        </div>
        <div className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <h2 className="text-lg font-bold text-brand-gold">الأوامر الآمنة</h2>
          <p className="text-xs leading-6 text-brand-cream/45">كل أمر مرتبط بمحول مالك مسجل. الفحص قراءة فقط، بينما إيقاف واستئناف توليد الفيديو يطلبان MFA ويحفظان نسخة إعداد جديدة وسجل تدقيق.</p>
          {canManage ? (
            <>
              <form action={runOmnisSafeCommandAction} className="space-y-3 rounded-xl border border-brand-gold/10 bg-black/10 p-3">
                <input type="hidden" name="command_key" value="refresh-operational-status" />
                <div>
                  <p className="text-sm font-semibold text-brand-cream/80">إعادة فحص الحالة التشغيلية</p>
                  <p className="mt-1 text-[11px] leading-5 text-brand-cream/40">قراءة Supabase وGitHub والطابور وVercel ثم تسجيل ملخص الفحص في سجل الإدارة.</p>
                </div>
                <button type="submit" className="w-full rounded-lg border border-brand-gold/25 bg-brand-gold/10 px-3 py-2 text-xs font-semibold text-brand-gold hover:bg-brand-gold/15">تشغيل الفحص الآمن</button>
              </form>
              <form action={runOmnisSafeCommandAction} className="space-y-2 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
                <input type="hidden" name="command_key" value="pause-video-automation" />
                <div>
                  <p className="text-sm font-semibold text-amber-100/85">إيقاف توليد الفيديوهات</p>
                  <p className="text-[11px] leading-5 text-amber-100/55">يحوّل مفتاح العامل المركزي إلى إيقاف عبر سجل إعدادات ذي نسخ. لا يحذف الطلبات أو ملفات الوسائط ولا يغيّر إعداد النشر الاجتماعي.</p>
                </div>
                <button type="submit" className="w-full rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/15">إيقاف العامل مع MFA</button>
              </form>
              <form action={runOmnisSafeCommandAction} className="space-y-2 rounded-xl border border-red-400/15 bg-red-400/5 p-3">
                <input type="hidden" name="command_key" value="resume-video-automation" />
                <div>
                  <p className="text-sm font-semibold text-red-100/85">استئناف توليد الفيديوهات</p>
                  <p className="text-[11px] leading-5 text-red-100/55">قد يستأنف الدورات المجدولة ويستهلك موارد التوليد. يلزم MFA وكتابة عبارة التأكيد كما هي.</p>
                </div>
                <label className="grid gap-1 text-[10px] text-red-100/55">
                  اكتب ENABLE_VIDEO_AUTOMATION للتأكيد
                  <input name="confirmation" required pattern="ENABLE_VIDEO_AUTOMATION" autoComplete="off" className="rounded-lg border border-red-400/20 bg-black/20 px-3 py-2 text-xs text-brand-cream" dir="ltr" />
                </label>
                <button type="submit" className="w-full rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-400/15">استئناف العامل مع MFA</button>
              </form>
            </>
          ) : (
            <p className="text-xs text-brand-cream/40">لا تملك صلاحية system.manage لتشغيل الأوامر.</p>
          )}
          <p className="text-[10px] leading-5 text-brand-cream/30">تغيير حالة العامل لا ينفذ نشرًا اجتماعيًا ولا يرسل أي Workflow مباشرة. عمليات النشر وترقية الإصدارات تظل خارج قائمة السماح حتى اكتمال بواباتها المستقلة.</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/40">مراكز قائمة في النظام الحالي</p>
          <p className="mt-2 text-3xl font-bold text-emerald-200">{live}</p>
          <p className="mt-1 text-xs text-brand-cream/35">من أصل {OMNIS_CENTERS.length} مركزًا معرفًا</p>
        </article>
        <article className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/40">تكامل جزئي</p>
          <p className="mt-2 text-3xl font-bold text-sky-200">{partial}</p>
          <p className="mt-1 text-xs text-brand-cream/35">تحتاج توحيدًا وتوسعة</p>
        </article>
        <article className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/40">مراكز مخططة</p>
          <p className="mt-2 text-3xl font-bold text-amber-200">{planned}</p>
          <p className="mt-1 text-xs text-brand-cream/35">لم تُبنَ بعد كوحدات مستقلة</p>
        </article>
        <article className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/40">تقدم سجل التنفيذ</p>
          <p className="mt-2 text-3xl font-bold text-brand-gold">{snapshot.available ? `${completed}/${snapshot.items.length}` : "غير متاح"}</p>
          <p className="mt-1 text-xs text-brand-cream/35">المكتمل يتطلب Commit واختبارات مسجلة</p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-brand-gold">مراكز التحكم الثلاثون</h2>
            <p className="mt-1 text-xs leading-6 text-brand-cream/40">الروابط تفتح الصفحات الموجودة؛ أما المراكز المخططة فتظل معلّمة بوضوح حتى تنفيذها.</p>
          </div>
          <p className="text-xs text-brand-cream/35">قائم: {live} · جزئي: {partial} · مخطط: {planned}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {OMNIS_CENTERS.map((center) => {
            const operational = moduleStatusById.get(center.id);
            const operationalState = operational?.state ?? "unknown";
            const operationalDependencies = operational?.dependencies ?? [];
            return (
            <article key={center.id} className="flex min-h-44 flex-col gap-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-brand-cream">{center.title}</h3>
                  <p className="mt-1 text-[11px] text-brand-gold/65" dir="ltr">{center.subtitle}</p>
                </div>
                <span className={center.status === "active" ? "shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200" : center.status === "partial" ? "shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] text-sky-200" : "shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200"}>
                  {OMNIS_CENTER_STATUS_LABELS[center.status]}
                </span>
              </div>
              <p className="text-xs leading-6 text-brand-cream/50">{center.description}</p>
              <div className="space-y-1 rounded-lg border border-brand-gold/10 bg-black/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-brand-cream/40">الحالة التشغيلية للاعتماديات</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${OMNIS_OPERATIONAL_STATE_STYLES[operationalState]}`}>
                    {OMNIS_OPERATIONAL_STATE_LABELS[operationalState]}
                  </span>
                </div>
                <p className="text-[11px] leading-5 text-brand-cream/45">{operational?.summary ?? "لا تتوفر قراءة تشغيلية لهذا المركز."}</p>
                {operational?.checkedAt ? (
                  <p className="text-[10px] text-brand-cream/25" dir="ltr">Last probe: {new Date(operational.checkedAt).toLocaleString("en-GB")}</p>
                ) : null}
                {operationalDependencies.length ? (
                  <details className="pt-1">
                    <summary className="cursor-pointer text-[11px] font-semibold text-brand-gold/65">تفاصيل الاعتماديات ({operationalDependencies.length})</summary>
                    <div className="mt-2 space-y-2">
                      {operationalDependencies.map((dependency) => (
                        <div key={dependency.dependencyId} className="rounded-md border border-brand-gold/10 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-brand-cream/70">{dependency.label}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${OMNIS_OPERATIONAL_STATE_STYLES[dependency.state]}`}>
                              {OMNIS_OPERATIONAL_STATE_LABELS[dependency.state]}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-5 text-brand-cream/40">{dependency.summary}</p>
                          {dependency.source ? <p className="mt-1 text-[9px] text-brand-cream/25">{dependency.source}</p> : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              {center.path ? (
                <Link href={center.path} className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand-gold/20 px-3 py-2 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10">
                  فتح الوحدة <span aria-hidden="true">←</span>
                </Link>
              ) : (
                <span className="text-[11px] text-brand-cream/30">لا يوجد مسار تنفيذي بعد</span>
              )}
            </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-brand-gold/10 bg-black/15 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-brand-gold">سجل تنفيذ المراحل — Execution Ledger</h2>
            <p className="mt-1 text-xs leading-6 text-brand-cream/45">15 مرحلة · 45 نقطة تحقق. المفتاح الثابت لكل نقطة يمنع إدراجها مرتين، وتُسجل كل نقلة حالة في سجل أحداث مستقل.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-emerald-200">مكتمل: {snapshot.available ? completed : "—"}</span>
            <span className="rounded-lg bg-sky-400/10 px-2 py-1 text-sky-200">قيد التنفيذ: {snapshot.available ? inProgress : "—"}</span>
            <span className="rounded-lg bg-amber-400/10 px-2 py-1 text-amber-200">عوائق: {snapshot.available ? blocked : "—"}</span>
            <span className="rounded-lg bg-slate-400/10 px-2 py-1 text-slate-200">لم يبدأ: {snapshot.available ? pending : "—"}</span>
          </div>
        </div>

        {!snapshot.available ? (
          <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-7 text-red-100/80">{snapshot.error}</div>
        ) : snapshot.items.length === 0 ? (
          <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100/80">
            جدول سجل التنفيذ متاح لكنه لا يحتوي على مهام. راجع Migration OMNIS قبل متابعة التنفيذ.
          </div>
        ) : (
          <div className="space-y-5">
            {OMNIS_EXECUTION_PHASES.map((phase) => {
              const rows = snapshot.items.filter((item) => item.phase_key === phase.phaseKey);
              const phaseCompleted = rows.filter((item) => item.state === "completed").length;
              return (
                <section key={phase.phaseKey} className="space-y-3 rounded-xl border border-brand-gold/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-brand-cream">{phase.phaseKey} · {phase.title}</h3>
                    <span className="text-xs tabular-nums text-brand-cream/40">{phaseCompleted}/{rows.length} مكتمل</span>
                  </div>
                  {rows.map((item) => (
                    <article key={item.task_key} className="grid gap-3 border-t border-brand-gold/10 pt-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-[10px] text-brand-gold/65">{item.task_key}</code>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATE_STYLES[item.state] ?? ""}`}>{STATE_LABELS[item.state] ?? item.state}</span>
                        </div>
                        <p className="text-sm font-semibold text-brand-cream/85">{item.title}</p>
                        <p className="text-xs leading-6 text-brand-cream/45">{item.description}</p>
                        {item.commit_sha ? <p className="text-[10px] text-brand-cream/30" dir="ltr">Commit: {item.commit_sha.slice(0, 12)}</p> : null}
                        {item.tests_summary ? <p className="text-xs leading-6 text-emerald-100/65">{item.tests_summary}</p> : null}
                        {item.last_note ? <p className="text-xs leading-6 text-amber-100/65">ملاحظة: {item.last_note}</p> : null}
                      </div>
                      {canManage ? (
                        <form action={updateOmnisExecutionTaskAction} className="grid gap-2 rounded-lg bg-black/15 p-3">
                          <input type="hidden" name="task_key" value={item.task_key} />
                          <label className="grid gap-1 text-[11px] text-brand-cream/45">
                            حالة التنفيذ
                            <select name="state" defaultValue={item.state} className="rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-3 py-2 text-xs text-brand-cream">
                              {Object.entries(OMNIS_TASK_STATE_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                          </label>
                          <input name="commit_sha" maxLength={40} placeholder="Commit SHA (إلزامي عند الإكمال)" className="rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-3 py-2 text-xs text-brand-cream" dir="ltr"/>
                          <input name="tests_summary" maxLength={1000} placeholder="ملخص الاختبارات (إلزامي عند الإكمال)" className="rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-3 py-2 text-xs text-brand-cream"/>
                          <input name="note" maxLength={1000} placeholder="ملاحظة أو سبب العائق" className="rounded-lg border border-brand-gold/15 bg-brand-emeraldDeep px-3 py-2 text-xs text-brand-cream"/>
                          <button type="submit" className="rounded-lg border border-brand-gold/25 bg-brand-gold/10 px-3 py-2 text-xs font-semibold text-brand-gold hover:bg-brand-gold/15">تسجيل الحالة بأثر تدقيقي</button>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-gold/10 bg-black/10 p-5">
        <h2 className="font-bold text-brand-gold">آخر أحداث التنفيذ</h2>
        {snapshot.events.length === 0 ? (
          <p className="mt-2 text-xs text-brand-cream/35">{snapshot.available ? "لا توجد انتقالات حالة مسجلة بعد." : "السجل غير متاح."}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {snapshot.events.slice(0, 10).map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-gold/10 py-2 text-xs">
                <span className="text-brand-cream/70">{event.task_key} · {STATE_LABELS[event.next_state] ?? event.next_state}</span>
                <span className="text-brand-cream/35">{new Date(event.created_at).toLocaleString("ar-EG")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
