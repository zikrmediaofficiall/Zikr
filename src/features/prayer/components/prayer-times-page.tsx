"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Sunrise,
  Sun,
  Cloud,
  Sunset,
  Moon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useLanguage } from "@/components/layout/language-provider";
import {
  getPrayerTimes,
  getPrayerTimesByCity,
  getNextPrayer,
  getCurrentPrayer,
  getPrayerNameAr,
  formatPrayerTime,
} from "@/features/prayer/services/prayer-times";
import type { PrayerTimesResponse } from "@/features/prayer/services/prayer-times";
import { unlockAudioContext, isAudioUnlocked } from "@/lib/audio/spiritual-tones";
import { usePrayerAlert, PRAYER_NAMES_AR } from "@/features/prayer/hooks/use-prayer-alert";
import { resolveLocationLabel } from "@/lib/location/reverse-geocode";
import { OpenStreetMapAttribution } from "@/components/location/openstreetmap-attribution";
import { getSavedPrayerLocation, persistPrayerLocation } from "@/features/prayer/services/saved-prayer-location";
import {
  getDevicePrayerTimesForCity,
  getDevicePrayerTimesForLocation,
  saveDevicePrayerTimes,
} from "@/features/prayer/services/prayer-times-device-cache";

const CAIRO = { lat: 30.0444, lon: 31.2357, city: "القاهرة" };

export function PrayerTimesPage() {
  const { isEnglish } = useLanguage();
  const t = (ar: string, en: string) => (isEnglish ? en : ar);
  const [prayerData, setPrayerData] = useState<PrayerTimesResponse | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number; city: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setCurrentTime] = useState<Date>(new Date());
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; minutesUntil: number } | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<{ name: string; time: string } | null>(null);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { settings: azanSettings, togglePrayer } = usePrayerAlert({ passive: true });

  const handleUnlockAudio = () => {
    unlockAudioContext();
    setAudioUnlocked(isAudioUnlocked());
  };

  const loadForCoords = useCallback(async (lat: number, lon: number, city: string) => {
    setCurrentLocation({ lat, lon, city });
    setIsFetching(true);
    try {
      const data = await getPrayerTimes(lat, lon);
      if (data) {
        setPrayerData(data);
        setError(null);
        saveDevicePrayerTimes(city, lat, lon, data);
        await persistPrayerLocation({
          city,
          latitude: lat,
          longitude: lon,
          timezone: data.data.meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          isDefault: true,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const cached = getDevicePrayerTimesForLocation(lat, lon);
        if (cached) {
          setPrayerData(cached.data);
          void persistPrayerLocation({
            city: cached.city,
            latitude: cached.latitude,
            longitude: cached.longitude,
            timezone: cached.timezone,
            isDefault: true,
            updatedAt: new Date().toISOString(),
          }).catch(() => undefined);
          setError("تعذر الاتصال بالخدمة؛ نعرض مواقيت اليوم المحفوظة على هذا الجهاز لنفس الموقع.");
        } else {
          setError("فشل جلب مواقيت الصلاة، ولا توجد نسخة محفوظة صالحة لليوم والموقع الحالي.");
        }
      }
    } catch {
      const cached = getDevicePrayerTimesForLocation(lat, lon);
      if (cached) {
        setPrayerData(cached.data);
        void persistPrayerLocation({
          city: cached.city,
          latitude: cached.latitude,
          longitude: cached.longitude,
          timezone: cached.timezone,
          isDefault: true,
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);
        setError("الاتصال غير متاح؛ نعرض نسخة اليوم المحفوظة على هذا الجهاز.");
      } else {
        setError("حدث خطأ في جلب البيانات، ولا توجد نسخة يومية محفوظة لهذا الموقع.");
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    if (!("geolocation" in navigator)) {
      await loadForCoords(CAIRO.lat, CAIRO.lon, CAIRO.city);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          setError("تعذر قراءة إحداثيات الموقع. يمكنك البحث عن مدينتك يدويًا.");
          setIsFetching(false);
          setLoading(false);
          return;
        }
        const city = await resolveLocationLabel(latitude, longitude);
        await loadForCoords(latitude, longitude, city ?? (accuracy && accuracy > 5000 ? "موقع تقريبي" : "موقعك الحالي"));
      },
      async geoError => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "لم يتم السماح بالوصول إلى موقعك. يمكنك البحث عن مدينتك يدويًا."
            : geoError.code === geoError.TIMEOUT
              ? "انتهى وقت تحديد الموقع. يمكنك المحاولة مرة أخرى أو البحث عن مدينتك."
              : "تعذر تحديد موقعك. يمكنك البحث عن مدينتك يدويًا.";
        setError(message);
        setIsFetching(false);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [loadForCoords]);

  const fetchByCity = useCallback(async (city: string) => {
    setIsFetching(true);
    setError(null);
    try {
      const data = await getPrayerTimesByCity(city);
      if (data) {
        const latitude = data.data.meta.latitude;
        const longitude = data.data.meta.longitude;
        const timezone = data.data.meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        setPrayerData(data);
        setCurrentLocation({ lat: latitude, lon: longitude, city });
        setError(null);
        saveDevicePrayerTimes(city, latitude, longitude, data);
        await persistPrayerLocation({
          city,
          latitude,
          longitude,
          timezone,
          isDefault: true,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const cached = getDevicePrayerTimesForCity(city);
        if (cached) {
          setPrayerData(cached.data);
          setCurrentLocation({ lat: cached.latitude, lon: cached.longitude, city: cached.city });
          void persistPrayerLocation({
            city: cached.city,
            latitude: cached.latitude,
            longitude: cached.longitude,
            timezone: cached.timezone,
            isDefault: true,
            updatedAt: new Date().toISOString(),
          }).catch(() => undefined);
          setError("تعذر الاتصال بالخدمة؛ نعرض مواقيت اليوم المحفوظة لهذه المدينة.");
        } else {
          setError("لم يتم العثور على المدينة أو لا توجد نسخة مواقيت يومية محفوظة لها.");
        }
      }
    } catch {
      const cached = getDevicePrayerTimesForCity(city);
      if (cached) {
        setPrayerData(cached.data);
        setCurrentLocation({ lat: cached.latitude, lon: cached.longitude, city: cached.city });
        void persistPrayerLocation({
          city: cached.city,
          latitude: cached.latitude,
          longitude: cached.longitude,
          timezone: cached.timezone,
          isDefault: true,
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);
        setError("الاتصال غير متاح؛ نعرض نسخة مواقيت اليوم المحفوظة لهذه المدينة.");
      } else {
        setError("حدث خطأ في البحث، ولا توجد نسخة يومية محفوظة لهذه المدينة.");
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (prayerData?.data?.timings) {
        const timeZone = prayerData.data.meta.timezone;
        setNextPrayer(getNextPrayer(prayerData.data.timings, now, timeZone));
        setCurrentPrayer(getCurrentPrayer(prayerData.data.timings, now, timeZone));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prayerData]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const saved = await getSavedPrayerLocation();
      if (saved) {
        setCurrentLocation({ lat: saved.latitude, lon: saved.longitude, city: saved.city });
        try {
          const data = await getPrayerTimes(saved.latitude, saved.longitude);
          if (!disposed && data) {
            setPrayerData(data);
            setLoading(false);
            setIsFetching(false);
            setError(null);
            saveDevicePrayerTimes(saved.city, saved.latitude, saved.longitude, data);
            const timezone = data.data.meta.timezone || saved.timezone;
            if (timezone !== saved.timezone) {
              await persistPrayerLocation({ ...saved, timezone, updatedAt: new Date().toISOString() });
            }
          } else if (!disposed) {
            const cached = getDevicePrayerTimesForLocation(saved.latitude, saved.longitude);
            setLoading(false);
            setIsFetching(false);
            if (cached) {
              setPrayerData(cached.data);
              setError("أنت غير متصل؛ نعرض مواقيت اليوم المحفوظة على هذا الجهاز لموقعك المختار.");
            } else {
              setError("تعذر تحديث مواقيت هذا الموقع، ولا توجد نسخة يومية صالحة محفوظة.");
            }
          }
        } catch {
          if (!disposed) {
            const cached = getDevicePrayerTimesForLocation(saved.latitude, saved.longitude);
            setLoading(false);
            setIsFetching(false);
            if (cached) {
              setPrayerData(cached.data);
              setError("الاتصال غير متاح؛ نعرض مواقيت اليوم المحفوظة على هذا الجهاز.");
            } else {
              setError("تعذر جلب المواقيت ولا توجد نسخة صالحة لهذا اليوم والموقع.");
            }
          }
        }
        return;
      }

      if (!disposed) {
        // First-time user: do not trigger the browser location prompt on load.
        // Show Cairo as a default and let the user tap "use my location".
        await loadForCoords(CAIRO.lat, CAIRO.lon, CAIRO.city);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [loadForCoords]);

  const timings = prayerData?.data?.timings;
  const meta = prayerData?.data?.meta;
  const date = prayerData?.data?.date;
  const prayersList: Array<{ name: string; nameAr: string; time: string; icon: LucideIcon }> = timings
    ? [
        { name: "Fajr", nameAr: "الفجر", time: timings.Fajr, icon: Sunrise },
        { name: "Dhuhr", nameAr: "الظهر", time: timings.Dhuhr, icon: Sun },
        { name: "Asr", nameAr: "العصر", time: timings.Asr, icon: Cloud },
        { name: "Maghrib", nameAr: "المغرب", time: timings.Maghrib, icon: Sunset },
        { name: "Isha", nameAr: "العشاء", time: timings.Isha, icon: Moon },
      ]
    : [];

  return (
    <Container className="py-12 space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-brand-gold">{t("مواقيت الصلاة", "Prayer times")}</h1>
        <p className="max-w-2xl mx-auto text-lg leading-8 arabic-muted">{t("احصل على مواقيت الصلاة الدقيقة لموقعك", "Get accurate prayer times for your location")}</p>
        {currentLocation && (
          <>
            <div className="text-lg text-brand-cream">{currentLocation.city}</div>
            <OpenStreetMapAttribution className="text-xs text-brand-cream/35" />
          </>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant={audioUnlocked ? "ghost" : "secondary"} onClick={handleUnlockAudio} className="text-sm">{audioUnlocked ? t("الصوت مفعّل", "Sound on") : t("تفعيل صوت الأذان", "Enable adhan sound")}</Button>
          <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold/25 px-4 py-2 text-sm text-brand-cream/70 transition-colors hover:border-brand-gold/50 hover:text-brand-gold"><Settings className="h-4 w-4" aria-hidden="true" /> {t("إعدادات الأذان", "Adhan settings")}</Link>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={requestLocation} disabled={isFetching}>{t("استخدم موقعي الحالي", "Use my current location")}</Button>
          <Button onClick={() => setShowCitySearch(v => !v)} variant="secondary">{t("ابحث عن مدينة", "Search for a city")}</Button>
        </div>
        {showCitySearch && <form className="flex gap-2 justify-center max-w-md mx-auto" onSubmit={e => { e.preventDefault(); if (cityQuery.trim()) fetchByCity(cityQuery.trim()); }}><input type="text" value={cityQuery} onChange={e => setCityQuery(e.target.value)} placeholder={t("أدخل اسم المدينة، مثال: القاهرة", "Enter a city name, e.g. Cairo")} aria-label={t("اسم المدينة", "City name")} className="flex-1 rounded-lg border border-brand-gold/30 bg-black/30 px-4 py-2 text-brand-cream placeholder:text-brand-cream/40 focus:border-brand-gold focus:outline-none" /><Button type="submit" disabled={isFetching || !cityQuery.trim()}>{t("بحث", "Search")}</Button></form>}
      </section>
      {error && <Card className="border-red-500/30 bg-red-900/10 p-4 text-center space-y-2"><p className="text-red-300 text-sm">{error}</p><Button variant="secondary" onClick={requestLocation}>{t("إعادة المحاولة", "Try again")}</Button></Card>}
      {loading && !prayerData && <Card className="text-center p-8"><p className="text-brand-cream/60">{t("جاري تحميل مواقيت الصلاة...", "Loading prayer times...")}</p></Card>}
      {isFetching && prayerData && <p className="text-center text-xs text-brand-cream/40 animate-pulse">{t("جاري تحديث المواقيت...", "Updating prayer times...")}</p>}
      {prayerData && <>
        {nextPrayer && <Card className="bg-gradient-to-r from-brand-gold/10 to-brand-emerald/10 border-brand-gold/50 p-6 text-center space-y-3"><h2 className="text-2xl font-bold text-brand-gold">{currentPrayer ? (isEnglish ? `Current prayer: ${currentPrayer.name}` : `الصلاة الحالية: ${getPrayerNameAr(currentPrayer.name)}`) : t("الصلاة القادمة", "Next prayer")}</h2><p className="text-3xl font-bold text-brand-cream">{isEnglish ? nextPrayer.name : getPrayerNameAr(nextPrayer.name)} - {formatPrayerTime(nextPrayer.time)}</p><p className="text-lg text-brand-cream/70">{isEnglish ? `In ${Math.floor(nextPrayer.minutesUntil / 60)} h ${nextPrayer.minutesUntil % 60} min` : `بعد ${Math.floor(nextPrayer.minutesUntil / 60)} ساعة و ${nextPrayer.minutesUntil % 60} دقيقة`}</p></Card>}
        <section className="space-y-6"><SectionHeader title={t("الصلوات الخمس", "The five prayers")} subtitle={isEnglish ? `${date?.hijri.day} ${date?.hijri.month.en} ${date?.hijri.year} AH` : `${date?.hijri.day} ${date?.hijri.month.ar} ${date?.hijri.year} هـ`} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{prayersList.map(prayer => <Card key={prayer.name} className={`text-center space-y-3 transition-all ${currentPrayer?.name === prayer.name ? "border-brand-gold bg-brand-gold/10" : nextPrayer?.name === prayer.name ? "border-brand-gold/50 bg-brand-emerald/5" : "hover:border-brand-gold/30"}`}><prayer.icon className="h-8 w-8 text-brand-gold/80 mx-auto" /><h3 className="text-xl font-bold text-brand-gold">{isEnglish ? prayer.name : prayer.nameAr}</h3>{!isEnglish && <p className="text-sm text-brand-cream/60">{prayer.name}</p>}<Badge variant="secondary" className="justify-center">{formatPrayerTime(prayer.time)}</Badge><button onClick={() => togglePrayer(prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey)} className={`mx-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs transition-colors ${azanSettings.enabledPrayers[prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey] ? "bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/25" : "bg-brand-cream/5 text-brand-cream/30 hover:bg-brand-cream/10"}`} aria-label={isEnglish ? `${azanSettings.enabledPrayers[prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey] ? "Disable" : "Enable"} adhan for ${prayer.name}` : `${azanSettings.enabledPrayers[prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey] ? "تعطيل" : "تفعيل"} أذان ${PRAYER_NAMES_AR[prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey]}`}><span>{azanSettings.enabledPrayers[prayer.name as import("@/features/prayer/hooks/use-prayer-alert").PrayerKey] ? t("التنبيه مفعّل", "Alert on") : t("التنبيه معطّل", "Alert off")}</span></button></Card>)}</div></section>
        {timings && <section className="space-y-6"><SectionHeader title={t("أوقات إضافية", "Additional times")} /><div className="grid gap-4 md:grid-cols-3"><Card className="text-center space-y-2"><p className="text-brand-gold font-semibold">{t("الإمساك", "Imsak")}</p><p className="text-2xl font-bold text-brand-cream">{formatPrayerTime(timings.Imsak)}</p></Card><Card className="text-center space-y-2"><p className="text-brand-gold font-semibold">{t("الشروق", "Sunrise")}</p><p className="text-2xl font-bold text-brand-cream">{formatPrayerTime(timings.Sunrise)}</p></Card><Card className="text-center space-y-2"><p className="text-brand-gold font-semibold">{t("منتصف الليل", "Midnight")}</p><p className="text-2xl font-bold text-brand-cream">{formatPrayerTime(timings.Midnight)}</p></Card></div></section>}
        {meta && <Card className="space-y-4"><h3 className="text-lg font-bold text-brand-gold">{t("معلومات الموقع", "Location details")}</h3><div className="grid gap-4 md:grid-cols-2"><div><p className="text-sm text-brand-cream/60">{t("الموقع الجغرافي", "Coordinates")}</p><p className="text-brand-cream">{meta.latitude.toFixed(4)}° N, {meta.longitude.toFixed(4)}° E</p></div><div><p className="text-sm text-brand-cream/60">{t("المنطقة الزمنية", "Time zone")}</p><p className="text-brand-cream">{meta.timezone}</p></div><div><p className="text-sm text-brand-cream/60">{t("طريقة الحساب", "Calculation method")}</p><p className="text-brand-cream">{meta.method.name}</p></div><div><p className="text-sm text-brand-cream/60">{t("مذهب الفقه", "School of jurisprudence")}</p><p className="text-brand-cream">{meta.school === "Shafi" ? t("الشافعي", "Shafi'i") : meta.school}</p></div></div></Card>}
      </>}
      <section className="space-y-4"><SectionHeader title={t("معلومات مهمة", "Important information")} /><div className="grid gap-4 md:grid-cols-2"><Card className="space-y-2"><h3 className="text-lg text-brand-gold">{t("شروط الصلاة", "Conditions of prayer")}</h3><ul className="text-sm leading-7 arabic-muted space-y-1"><li>{t("- الإسلام والعقل والتمييز", "- Islam, sound mind and discernment")}</li><li>{t("- الطهارة من الحدث الأصغر والأكبر", "- Purity from minor and major impurity")}</li><li>{t("- طهارة البدن والثوب والمكان", "- A clean body, clothing and place")}</li><li>{t("- ستر العورة", "- Covering the awrah")}</li><li>{t("- دخول الوقت", "- The prayer time has begun")}</li><li>{t("- استقبال القبلة", "- Facing the Qibla")}</li><li>{t("- النية", "- Intention")}</li></ul></Card><Card className="space-y-2"><h3 className="text-lg text-brand-gold">{t("نصائح مهمة", "Helpful tips")}</h3><ul className="text-sm leading-7 arabic-muted space-y-1"><li>{t("- تحقق من دقة موقعك الجغرافي", "- Check that your location is accurate")}</li><li>{t("- استخدم طريقة حساب معتمدة", "- Use a recognized calculation method")}</li><li>{t("- أضف وقت تنبيه قبل الصلاة", "- Add an alert before the prayer")}</li><li>{t("- حافظ على مواقيت الصلاة", "- Keep to the prayer times")}</li><li>{t("- لا تؤخر الصلاة عن وقتها", "- Do not delay prayer past its time")}</li></ul></Card></div></section>
    </Container>
  );
}
