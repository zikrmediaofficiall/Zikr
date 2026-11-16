export function averageRenderDuration(
  rows: Array<{ render_duration_ms: number | null }>,
  total: number | null,
): number | null {
  if (total === null || total !== rows.length || rows.length === 0) return null;
  const durations = rows.map((row) => row.render_duration_ms).filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  if (durations.length !== rows.length) return null;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export type Ga4ReportingStatus =
  | "connected"
  | "authorization_required"
  | "unavailable"
  | "not_configured";

export type Ga4ReportingStatusPresentation = {
  connected: boolean;
  label: string;
  description: string;
  measurementDescription: string;
};

/** Keep the measurement-ID state separate from the authenticated Data API state. */
export function getGa4ReportingStatusPresentation(
  status: Ga4ReportingStatus,
  measurementConfigured: boolean,
): Ga4ReportingStatusPresentation {
  const measurementDescription = measurementConfigured
    ? "معرّف القياس متاح لإرسال أحداث الموقع."
    : "معرّف القياس غير متاح في بيئة تشغيل التطبيق الحالية.";

  switch (status) {
    case "connected":
      return {
        connected: true,
        label: "تقارير GA4 متصلة",
        description: "تم التحقق من اتصال Google Analytics Data API؛ الأرقام المعروضة مأخوذة من التقارير الفعلية.",
        measurementDescription,
      };
    case "authorization_required":
      return {
        connected: false,
        label: "تحتاج إعادة تفويض",
        description: "إعدادات تقارير GA4 موجودة، لكن رمز OAuth لا يملك صلاحية القراءة المطلوبة أو لا يستطيع الوصول إلى الخاصية.",
        measurementDescription,
      };
    case "unavailable":
      return {
        connected: false,
        label: "التقارير غير متاحة مؤقتًا",
        description: "تعذر الوصول إلى تقارير GA4 حاليًا؛ لا تُستبدل البيانات المفقودة بأصفار.",
        measurementDescription,
      };
    case "not_configured":
      return {
        connected: false,
        label: "التقارير غير مهيأة",
        description: measurementConfigured
          ? "معرّف القياس مضبوط، لكن إعدادات OAuth أو معرّف خاصية GA4 غير مكتملة."
          : "يلزم إعداد معرّف القياس وإعدادات OAuth ومعرّف خاصية GA4 لقراءة التقارير.",
        measurementDescription,
      };
  }
}
