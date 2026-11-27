# توثيق التحقق من ملكية الموقع في Google Search Console

## الحالة الحالية

الموقع يستخدم طريقتين متكاملتين للتحقق من ملكية النطاق `https://zikrmediaofficial.vercel.app`:

1. **وسما HTML داخل الصفحة الرئيسية** من خلال `verification.google` في `src/app/layout.tsx`.
2. **ملفا HTML ثابتان** داخل `public/`:
   - `/google3526c15e10fa1913.html`
   - `/google6f7827292f8e19bc.html`

لا تحذف أي رمز تحقق ما دامت الخاصية المرتبطة به موجودة في Search Console.

## GA4 وGoogle Tag Manager — الإعداد الجديد

الإعداد الإنتاجي الجديد الخاص بموقع ZIKR يستخدم حاوية GTM واحدة:

- **GA4 Measurement ID:** `G-EMG4X46V0S`
- **GA4 Web Stream ID:** `16431107734`
- **GTM Container ID:** `GTM-WM4SD7HP`
- **Canonical URL:** `https://zikrmediaofficial.vercel.app`

يُحمّل GTM من `src/components/layout/web-advertising-runtime.tsx` فقط، بعد التحقق من منصة الويب والنطاق الإنتاجي canonical. لا يُحمّل `gtag.js` مباشرة بالتوازي. أضف Google Tag داخل حاوية `GTM-WM4SD7HP` باستخدام Measurement ID الجديد، واضبط حدث Page View مرة واحدة فقط.

### متغيرات Vercel Production

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-EMG4X46V0S
NEXT_PUBLIC_GTM_ID=GTM-WM4SD7HP
```

هذه المعرفات عامة وليست أسرارًا. لا تضع OAuth refresh token أو client secret في متغيرات `NEXT_PUBLIC_*`.

### فحوصات ما بعد النشر

1. في View Source يجب أن يظهر مصدر GTM واحد فقط، وألا يظهر مصدر `gtag/js` المباشر.
2. في Tag Assistant يجب أن يظهر `GTM-WM4SD7HP` ويتصل بالموقع.
3. يجب أن يطلق Google Tag المرتبط بـ `G-EMG4X46V0S` مرة واحدة لكل تحميل صفحة.
4. في GTM Preview → Hits Sent يجب أن يظهر `page_view` أو GA4 page_view hit.
5. في GA4 Realtime يجب ظهور الجلسة التجريبية. ظهور Tag Fired وحده لا يثبت وصول Hit.
6. افحص Console وNetwork عند وجود CSP أو Consent blockers قبل تعديل سياسة CSP.

لا تحذف الحاويات أو الخصائص القديمة من Google قبل نجاح هذه الفحوصات والتأكد من عدم ارتباطها بتطبيق أو موقع آخر.

## تقارير GA4 في لوحة الإدارة

لوحة تقارير GA4 تستخدم Google Analytics Data API ببيانات اعتماد خادمية مستقلة عن Measurement ID. راجع `docs/admin/GA4_REPORTING_SETUP.md` لإعداد `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` و`GA4_PROPERTY_ID` و`GA4_REFRESH_TOKEN`. يجب أن يبقى Refresh Token خادميًا فقط وبنطاق `analytics.readonly`.

## التحقق من Search Console

شغّل `pnpm search-console:check`، وبعد النشر تحقق من ملفات HTML ورموز meta على النطاق الفعلي قبل إعادة Verify.
