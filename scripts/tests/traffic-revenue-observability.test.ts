import assert from "node:assert/strict";
import { averageRenderDuration, getGa4ReportingStatusPresentation } from "../../src/features/admin/services/traffic-revenue-metrics";

assert.equal(averageRenderDuration([{ render_duration_ms: 1000 }, { render_duration_ms: 3000 }], 2), 2000);
assert.equal(averageRenderDuration([{ render_duration_ms: 1000 }, { render_duration_ms: null }], 2), null);
assert.equal(averageRenderDuration([{ render_duration_ms: 1000 }], 2), null);
assert.equal(averageRenderDuration([], 0), null);

console.log("✅ Internal video-render observability tests passed.");

const connectedGa4 = getGa4ReportingStatusPresentation("connected", true);
assert.equal(connectedGa4.connected, true);
assert.equal(connectedGa4.label, "تقارير GA4 متصلة");
assert.match(connectedGa4.description, /Google Analytics Data API/);
assert.equal(connectedGa4.measurementDescription, "معرّف القياس متاح لإرسال أحداث الموقع.");

const reauthorizationGa4 = getGa4ReportingStatusPresentation("authorization_required", true);
assert.equal(reauthorizationGa4.connected, false);
assert.equal(reauthorizationGa4.label, "تحتاج إعادة تفويض");
assert.match(reauthorizationGa4.description, /OAuth/);

const unavailableGa4 = getGa4ReportingStatusPresentation("unavailable", false);
assert.equal(unavailableGa4.connected, false);
assert.equal(unavailableGa4.label, "التقارير غير متاحة مؤقتًا");
assert.match(unavailableGa4.description, /لا تُستبدل البيانات المفقودة بأصفار/);
assert.equal(unavailableGa4.measurementDescription, "معرّف القياس غير متاح في بيئة تشغيل التطبيق الحالية.");

const unconfiguredGa4WithMeasurement = getGa4ReportingStatusPresentation("not_configured", true);
assert.equal(unconfiguredGa4WithMeasurement.label, "التقارير غير مهيأة");
assert.match(unconfiguredGa4WithMeasurement.description, /معرّف القياس مضبوط/);

const unconfiguredGa4WithoutMeasurement = getGa4ReportingStatusPresentation("not_configured", false);
assert.match(unconfiguredGa4WithoutMeasurement.description, /يلزم إعداد معرّف القياس/);
