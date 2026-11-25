'use client';

import { ContentGuide } from "@/components/content/content-guide";

import { useLanguage } from '@/components/layout/language-provider';
import { PrayerTimesPage } from '@/features/prayer/components/prayer-times-page';

export default function Page() {
  const { isEnglish } = useLanguage();
  return (
    <>
      <PrayerTimesPage />
      <div className="container mx-auto px-4 pb-12">
        {isEnglish ? (
          <ContentGuide
            locale="en"
            title="How do prayer times work?"
            intro="This page calculates today's times from your location or the city you choose, then shows the current and next prayer with the alert tools available on your device."
            items={[
              "The location can be detected automatically, searched by city, or taken from the location saved in the browser.",
              "When the location cannot be detected, the default city is used instead of leaving the page empty.",
              "The times depend on the calculation service the app uses, so small differences from some local timetables can appear.",
              "Alert and sound settings are separate from the times display, and can be turned off in settings without hiding the times.",
            ]}
            links={[
              { label: "App settings", href: "/settings" },
              { label: "Qibla direction", href: "/qibla" },
            ]}
            note="The page uses GPS only after you give permission. If you decline, you can choose a city manually."
          />
        ) : (
        <ContentGuide
          title="كيف تعمل مواقيت الصلاة؟"
          intro="تحسب صفحة المواقيت أوقات اليوم من موقعك أو المدينة التي تختارها، ثم تعرض الصلاة الحالية والقادمة مع أدوات التنبيه المتاحة في جهازك."
          items={[
            "يمكن تحديد الموقع تلقائيًا، أو البحث عن مدينة، أو الاعتماد على الموقع المحفوظ في المتصفح.",
            "عند تعذر تحديد الموقع يمكن استخدام المدينة الافتراضية بدل ترك الصفحة فارغة.",
            "المواعيد المعروضة تعتمد على بيانات خدمة الحساب المستخدمة في التطبيق؛ قد تظهر فروق بسيطة عن بعض الجداول المحلية.",
            "إعدادات التنبيه والصوت منفصلة عن عرض المواقيت، ويمكن تعطيلها من الإعدادات دون إخفاء الأوقات.",
          ]}
          links={[
            { label: "إعدادات التطبيق", href: "/settings" },
            { label: "اتجاه القبلة", href: "/qibla" },
          ]}
          note="لا تستخدم الصفحة GPS إلا بعد طلب الإذن. إذا رفضت الإذن، يمكنك اختيار المدينة يدويًا."
        />
        )}
      </div>
    </>
  );
}
