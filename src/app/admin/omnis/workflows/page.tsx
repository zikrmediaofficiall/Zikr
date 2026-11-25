export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { definitionToFields } from "@/features/automation/workflow-designer";
import { AUTOMATION_ACTION_TYPES, APPROVAL_REQUIRED_ACTIONS, isAutomationEngineEnabled } from "@/features/automation/workflow-engine";
import { isKillSwitchOn, listDeadLetters, listRuns, listWorkflows, type StoredDeadLetter, type StoredRun, type StoredWorkflow } from "@/features/automation/workflow-store";
import { approveRunAction, runWorkflowAction, saveWorkflowAction, toggleWorkflowAction } from "./actions";

export const metadata: Metadata = { title: "مصمم سير العمل | ZIKR OMNIS" };

const input = "w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm";
const button = "rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-sm font-semibold text-brand-gold";

export default async function WorkflowDesignerPage({ searchParams }: { searchParams: Promise<{ key?: string; ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { key, ok, error } = await searchParams;
  let workflows: StoredWorkflow[] = [];
  let runs: StoredRun[] = [];
  let dead: StoredDeadLetter[] = [];
  let loadError: string | null = null;
  try {
    [workflows, runs, dead] = await Promise.all([listWorkflows(), listRuns(), listDeadLetters()]);
  } catch {
    loadError = "تعذرت قراءة جداول التشغيل الآلي. إن لم تُطبَّق ملفات الترحيل بعد فهذا متوقع.";
  }
  const selected = workflows.find((w) => w.key === key);
  const f = selected ? definitionToFields(selected.definition) : { key: "", triggerType: "event", triggerName: "", conditions: "failed_count gte 5", actions: "notify_admin message=تنبيه", verification: "", maxAttempts: 3, baseDelayMs: 500, timeoutMs: 10000, perHour: 6 };

  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">مصمم سير العمل</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          المحرك {isAutomationEngineEnabled() ? "مفعّل" : "متوقف (AUTOMATION_ENGINE_ENABLED)"} · مفتاح الإيقاف العام {isKillSwitchOn() ? "مفعّل: لا تشغيل" : "غير مفعّل"}.
          التشغيل التجريبي هو الافتراضي. الإجراءات التي تغيّر الحالة ({APPROVAL_REQUIRED_ACTIONS.join("، ")}) تحتاج موافقة مشرف آخر. المنفَّذ حاليًا: notify_admin وrevalidate_path؛ بقية الإجراءات تُسجَّل في الرسائل الفاشلة ولا تُنفَّذ. التشغيل بالجدولة غير موصول بعد: التشغيل يدوي فقط.
        </p>
      </header>
      {ok ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100/90">{ok}</p> : null}
      {error || loadError ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error ?? loadError}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          <h2 className="font-bold text-brand-gold">سير العمل</h2>
          <ul className="space-y-2 text-sm">
            {workflows.map((w) => (
              <li key={w.key}>
                <Link href={`${"/admin/omnis/workflows"}?key=${w.key}`} className="block rounded-xl border border-brand-gold/10 bg-black/15 p-3 hover:border-brand-gold/30">
                  <span className="font-mono text-brand-cream" dir="ltr">{w.key}</span>
                  <span className="mt-1 block text-xs text-brand-cream/50">{w.enabled ? "مفعّل" : "معطّل"}</span>
                </Link>
              </li>
            ))}
            {!workflows.length && !loadError ? <li className="text-xs text-brand-cream/40">لا يوجد سير عمل بعد.</li> : null}
          </ul>
        </aside>

        <div className="space-y-6">
          <form action={saveWorkflowAction} className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
            <h2 className="font-bold text-brand-gold">{selected ? "تعديل (يعود معطّلًا بعد الحفظ)" : "سير عمل جديد"}</h2>
            <input name="key" defaultValue={f.key} dir="ltr" placeholder="alert-on-failures" required className={input} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="triggerType" defaultValue={f.triggerType} className={input}><option value="event">حدث</option><option value="schedule">جدولة (غير موصولة)</option></select>
              <input name="triggerName" defaultValue={f.triggerName} dir="ltr" placeholder="video.failed" required className={input} />
            </div>
            <label className="block text-xs text-brand-cream/50">الشروط، سطر لكل شرط: الحقل ثم eq/neq/gt/lt/gte/lte ثم القيمة</label>
            <textarea name="conditions" defaultValue={f.conditions} rows={3} dir="ltr" className={`${input} font-mono`} />
            <label className="block text-xs text-brand-cream/50">الإجراءات، سطر لكل إجراء: النوع ثم مفتاح=قيمة. الأنواع: {AUTOMATION_ACTION_TYPES.join("، ")}</label>
            <textarea name="actions" defaultValue={f.actions} rows={3} dir="ltr" required className={`${input} font-mono`} />
            <input name="verification" defaultValue={f.verification} placeholder="ما الذي يثبت نجاح التنفيذ؟" required className={input} />
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs text-brand-cream/50">محاولات<input name="maxAttempts" type="number" min={1} max={5} defaultValue={f.maxAttempts} className={input} /></label>
              <label className="text-xs text-brand-cream/50">تأخير (م.ث)<input name="baseDelayMs" type="number" min={100} defaultValue={f.baseDelayMs} className={input} /></label>
              <label className="text-xs text-brand-cream/50">مهلة (م.ث)<input name="timeoutMs" type="number" min={1000} max={300000} defaultValue={f.timeoutMs} className={input} /></label>
              <label className="text-xs text-brand-cream/50">حد/ساعة<input name="perHour" type="number" min={1} max={600} defaultValue={f.perHour} className={input} /></label>
            </div>
            <button type="submit" className={button}>حفظ</button>
          </form>

          {selected ? (
            <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
              <h2 className="font-bold text-brand-gold">تشغيل وتحكم: <span className="font-mono" dir="ltr">{selected.key}</span></h2>
              <form action={runWorkflowAction} className="space-y-2">
                <input type="hidden" name="key" value={selected.key} />
                <textarea name="facts" rows={3} dir="ltr" placeholder={"failed_count=7\nenv=production"} className={`${input} font-mono`} />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" name="mode" value="dry_run" className={button}>تشغيل تجريبي</button>
                  <button type="submit" name="mode" value="live" className="rounded-xl border border-amber-500/40 px-4 py-2 text-sm text-amber-200">تشغيل فعلي</button>
                </div>
              </form>
              <form action={toggleWorkflowAction}>
                <input type="hidden" name="key" value={selected.key} />
                <input type="hidden" name="enabled" value={selected.enabled ? "false" : "true"} />
                <button type="submit" className={selected.enabled ? "rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-200" : button}>{selected.enabled ? "إيقاف (مفتاح الإيقاف)" : "تفعيل"}</button>
              </form>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="font-bold text-brand-gold">آخر التشغيلات</h2>
            <ul className="space-y-2 text-sm">
              {runs.map((run) => (
                <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/10 bg-black/15 p-3">
                  <span><span className="font-mono" dir="ltr">{run.workflow_key}</span> · {run.mode === "dry_run" ? "تجريبي" : "فعلي"} · {run.status} · {run.attempts} محاولة · {new Date(run.created_at).toLocaleString("ar-EG")}</span>
                  {run.status === "needs_approval" ? (
                    <form action={approveRunAction}><input type="hidden" name="runId" value={run.id} /><button type="submit" className={button}>اعتماد وتنفيذ</button></form>
                  ) : null}
                </li>
              ))}
              {!runs.length ? <li className="text-xs text-brand-cream/40">لا تشغيلات.</li> : null}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-brand-gold">الرسائل الفاشلة (غير محلولة)</h2>
            <ul className="space-y-2 text-sm">
              {dead.map((d) => <li key={d.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">{d.failed_action} · {d.attempts} محاولة · {d.error ?? ""}</li>)}
              {!dead.length ? <li className="text-xs text-brand-cream/40">لا يوجد.</li> : null}
            </ul>
          </section>
        </div>
      </section>
    </Container>
  );
}
