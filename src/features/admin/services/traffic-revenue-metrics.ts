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

export type YoutubeAnalyticsStatus =
  | "connected"
  | "authorization_required"
  | "permission_denied"
  | "api_disabled"
  | "quota_exceeded"
  | "unavailable"
  | "not_configured";

export type YoutubeAnalyticsStatusPresentation = {
  label: string;
  description: string;
  connected: boolean;
  canReauthorize: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function googleErrorSignals(payload: unknown): string[] {
  const root = asRecord(payload);
  const error = asRecord(root?.error);
  const signals: string[] = [];
  for (const value of [error?.status, error?.message]) {
    if (typeof value === "string") signals.push(value);
  }
  const errors = Array.isArray(error?.errors) ? error.errors : [];
  for (const item of errors) {
    const entry = asRecord(item);
    if (typeof entry?.reason === "string") signals.push(entry.reason);
  }
  const details = Array.isArray(error?.details) ? error.details : [];
  for (const item of details) {
    const entry = asRecord(item);
    const metadata = asRecord(entry?.metadata);
    for (const value of [entry?.reason, metadata?.reason, metadata?.service]) {
      if (typeof value === "string") signals.push(value);
    }
  }
  return signals.join(" ").toLowerCase().split(/\s+/).slice(0, 120);
}

/** Map provider errors to a small safe status; never return provider messages to the UI. */
export function classifyYoutubeAnalyticsApiError(httpStatus: number, payload?: unknown): YoutubeAnalyticsStatus {
  if (httpStatus === 401) return "authorization_required";
  const signals = googleErrorSignals(payload).join(" ");
  if (/accessnotconfigured|servicedisabled|api.*not.*enabled|service.*disabled/.test(signals)) {
    return "api_disabled";
  }
  if (httpStatus === 429 || /quotaexceeded|dailylimitexceeded|ratelimitexceeded|resource_exhausted|quota/.test(signals)) {
    return "quota_exceeded";
  }
  if (httpStatus === 403 || /permission_denied|insufficientpermissions|forbidden|channelnotfound|usernotauthorized/.test(signals)) {
    return "permission_denied";
  }
  return "unavailable";
}

export function classifyYoutubeOAuthTokenError(httpStatus: number, payload?: unknown): YoutubeAnalyticsStatus {
  const root = asRecord(payload);
  const error = typeof root?.error === "string" ? root.error.toLowerCase() : "";
  if (error === "invalid_grant" || httpStatus === 401) return "authorization_required";
  if (httpStatus === 403) return "permission_denied";
  return "unavailable";
}

export function getYoutubeAnalyticsStatusPresentation(
  status: YoutubeAnalyticsStatus,
): YoutubeAnalyticsStatusPresentation {
  switch (status) {
    case "connected":
      return { connected: true, label: "بيانات مالك القناة متصلة", description: "التقرير صادر من YouTube Analytics للقناة المصرح بها.", canReauthorize: false };
    case "not_configured":
      return { connected: false, label: "غير مهيأة", description: "يلزم ضبط بيانات OAuth وربط حساب يملك القناة وصلاحية تقارير YouTube Analytics.", canReauthorize: true };
    case "authorization_required":
      return { connected: false, label: "تحتاج إعادة تفويض", description: "رفض OAuth رمز التحديث أو رمز الوصول؛ أعد ربط القناة بعد التحقق من الحساب المطلوب.", canReauthorize: true };
    case "api_disabled":
      return { connected: false, label: "YouTube Analytics API غير مفعّل", description: "فعّل YouTube Analytics API في مشروع Google المرتبط ببيانات OAuth، ثم أعد تحميل التقرير.", canReauthorize: false };
    case "quota_exceeded":
      return { connected: false, label: "حصة YouTube Analytics مستنفدة", description: "تجاوز الطلب حصة API المتاحة حاليًا؛ انتظر تجددها أو راجع حصة المشروع، ولا يلزم إعادة تفويض بسبب هذا الخطأ وحده.", canReauthorize: false };
    case "permission_denied":
      return { connected: false, label: "وصول القناة أو التقرير مرفوض", description: "تحقق من أن حساب OAuth يملك القناة وأن التفويض يتضمن صلاحية القراءة اللازمة؛ لا يُستنتج من هذا الخطأ وحده أن إعادة التفويض مطلوبة.", canReauthorize: false };
    case "unavailable":
      return { connected: false, label: "التقرير غير متاح مؤقتًا", description: "تعذر الوصول إلى تقرير YouTube Analytics؛ البيانات المفقودة لا تُعرض كأصفار.", canReauthorize: false };
  }
}

export type FacebookReelsInsightRow = {
  metrics: unknown;
  status: string | null;
  period: string | null;
  captured_at: string | null;
};

export type FacebookReelsAnalyticsSummary = {
  status: "connected" | "no_data" | "unavailable";
  observedReels: number | null;
  reelsWithInsights: number | null;
  plays: number | null;
  replays: number | null;
  socialActions: number | null;
};

function finiteMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Sum one canonical plays metric per Reel; alternate play counters are fallbacks, not additions. */
export function aggregateFacebookReelsInsights(
  rows: readonly FacebookReelsInsightRow[],
): FacebookReelsAnalyticsSummary {
  const lifetimeRows = rows.filter((row) => row.period === "lifetime");
  const available = lifetimeRows.filter((row) => row.status === "available");
  if (!available.length) {
    return {
      status: "no_data",
      observedReels: lifetimeRows.length,
      reelsWithInsights: 0,
      plays: null,
      replays: null,
      socialActions: null,
    };
  }

  let plays = 0;
  let playsObserved = 0;
  let replays = 0;
  let replaysObserved = 0;
  let socialActions = 0;
  let socialActionsObserved = 0;
  for (const row of available) {
    const metrics = asRecord(row.metrics);
    if (!metrics) continue;
    const canonicalPlays = finiteMetric(metrics.fb_reels_total_plays) ?? finiteMetric(metrics.blue_reels_play_count);
    if (canonicalPlays !== null) {
      plays += canonicalPlays;
      playsObserved += 1;
    }
    const replayCount = finiteMetric(metrics.fb_reels_replay_count);
    if (replayCount !== null) {
      replays += replayCount;
      replaysObserved += 1;
    }
    const actions = asRecord(metrics.post_video_social_actions);
    if (actions) {
      const values = Object.values(actions).map(finiteMetric).filter((value): value is number => value !== null);
      if (values.length) {
        socialActions += values.reduce((sum, value) => sum + value, 0);
        socialActionsObserved += 1;
      }
    }
  }

  return {
    status: "connected",
    observedReels: lifetimeRows.length,
    reelsWithInsights: available.length,
    plays: playsObserved ? plays : null,
    replays: replaysObserved ? replays : null,
    socialActions: socialActionsObserved ? socialActions : null,
  };
}

export function unavailableFacebookReelsAnalytics(): FacebookReelsAnalyticsSummary {
  return { status: "unavailable", observedReels: null, reelsWithInsights: null, plays: null, replays: null, socialActions: null };
}
