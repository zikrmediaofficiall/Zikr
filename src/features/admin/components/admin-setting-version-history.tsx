import { restoreAdminSettingVersionAction } from "@/app/admin/system-actions";
import { getAdminSettingDefinition } from "@/features/admin/config/settings-registry";
import type { AdminSettingVersionHistory } from "@/features/admin/services/setting-versions";

function valueLabel(value: boolean | number) {
  if (typeof value === "boolean") return value ? "مفعّل" : "متوقف";
  return value.toLocaleString("ar-EG-u-nu-latn");
}

function operationLabel(operation: "baseline" | "update" | "rollback") {
  if (operation === "baseline") return "خط الأساس";
  if (operation === "rollback") return "استعادة نسخة سابقة";
  return "تعديل";
}

export function AdminSettingVersionHistoryPanel({
  history,
  emptyLabel,
}: {
  history: AdminSettingVersionHistory;
  emptyLabel: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
      <div>
        <h2 className="text-lg font-bold text-brand-gold">سجل نسخ الإعدادات</h2>
        <p className="mt-1 text-sm leading-6 text-brand-cream/45">
          كل حفظ ينشئ نسخة جديدة. الاستعادة لا تمسح التاريخ؛ بل تنشئ إصدارًا جديدًا مرتبطًا بالنسخة المستعادة.
        </p>
      </div>

      {!history.available ? (
        <p role="status" className="text-sm text-amber-200/75">
          سجل النسخ غير متاح حاليًا. لم يتم تعطيل إعداداتك الحالية أو تغييرها.
        </p>
      ) : history.versions.length === 0 ? (
        <p className="text-sm text-brand-cream/45">{emptyLabel}</p>
      ) : (
        <ol className="space-y-3">
          {history.versions.map((version) => {
            const definition = getAdminSettingDefinition(version.setting_key);
            return (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/10 bg-black/10 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-brand-cream/85">{definition?.label ?? version.setting_key}</p>
                  <p className="mt-1 text-sm text-brand-gold">
                    {valueLabel(version.value)} · {operationLabel(version.operation)}
                  </p>
                  <p className="mt-1 text-xs text-brand-cream/35">
                    {new Date(version.created_at).toLocaleString("ar-EG-u-nu-latn")}
                  </p>
                </div>
                <form action={restoreAdminSettingVersionAction}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-brand-gold/20 px-3 py-2 text-xs text-brand-gold hover:bg-brand-gold/10"
                  >
                    استعادة هذه النسخة
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
