"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import { type Reciter } from "@/features/quran/types/quran";
import { getQuranReciters } from "@/features/quran/services/quran-client";
import {
  downloadQuranAudio,
  isQuranAudioDownloaded,
  removeQuranAudio,
  resolveQuranAudio,
} from "@/features/quran/services/offline-audio";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";

type FavoriteState = "unknown" | "saved" | "not-saved";

export function QuranAudioPlayer({
  surahId,
  initialReciterId,
}: {
  surahId: number;
  initialReciterId?: string;
}) {
  const { isEnglish } = useLanguage();
  const t = useCallback((ar: string, en: string) => (isEnglish ? en : ar), [isEnglish]);
  const [isClient, setIsClient] = useState(false);
  const [availableReciters, setAvailableReciters] = useState<Reciter[]>([]);
  const [reciter, setReciter] = useState<Reciter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [databaseAudioUrl, setDatabaseAudioUrl] = useState<string | null>(null);
  const [activeSourceUrl, setActiveSourceUrl] = useState<string | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [favoriteState, setFavoriteState] = useState<FavoriteState>("unknown");
  const audioRef = useRef<HTMLAudioElement>(null);
  const revokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    setIsClient(true);
    getQuranReciters()
      .then((data) => {
        if (!active) return;
        setAvailableReciters(data);
        if (data.length > 0) {
          const initial =
            (initialReciterId &&
              data.find(
                (item) =>
                  item.id === initialReciterId ||
                  item.code === initialReciterId,
              )) ||
            data[0];
          setReciter(initial);
        } else {
          setError(t("لا توجد تلاوات متاحة حاليًا.", "No recitations are available right now."));
        }
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("[audio] Failed to load reciters:", loadError);
        setError(t("تعذر تحميل قائمة القراء. حاول مرة أخرى.", "Could not load the reciter list. Please try again."));
      });

    return () => {
      active = false;
    };
  }, [initialReciterId, t]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setDatabaseAudioUrl(null);
    setActiveSourceUrl(null);
    setError(null);
    setOfflineReady(false);

    if (!isClient || !reciter?.code) return () => controller.abort();

    void fetch(
      `/api/quran/audio?surah=${surahId}&reciter=${encodeURIComponent(reciter.code)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    )
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              audio?: { audio_url?: string } | null;
            }>)
          : null,
      )
      .then(async (payload) => {
        const audioUrl = payload?.audio?.audio_url ?? null;
        if (!active) return;
        setDatabaseAudioUrl(audioUrl);
        if (!audioUrl) {
          setError(t("لا تتوفر هذه التلاوة في مكتبة الصوت الداخلية حاليًا.", "This recitation is not in the audio library yet."));
          return;
        }

        const downloaded = await isQuranAudioDownloaded(
          surahId,
          reciter.code,
        );
        if (active) setOfflineReady(downloaded);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        console.warn("[audio] Quran audio source unavailable", fetchError);
        if (active) setError(t("تعذر الوصول إلى مصدر التلاوة.", "Could not reach the recitation source."));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isClient, reciter, surahId, t]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isClient) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError(t("تعذر تشغيل هذا التسجيل. حاول مرة أخرى.", "Could not play this recording. Please try again."));
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [isClient, t]);

  useEffect(() => {
    if (!isClient) return;
    let active = true;
    void fetch(
      `/api/user/favorites?item_type=quran&item_ref=${encodeURIComponent(`surah:${surahId}`)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) return;
        const favorites = (await response.json()) as Array<{ item_ref?: string }>;
        if (active) {
          setFavoriteState(
            favorites.some((item) => item.item_ref === `surah:${surahId}`)
              ? "saved"
              : "not-saved",
          );
        }
      })
      .catch(() => setFavoriteState("not-saved"));
    return () => {
      active = false;
    };
  }, [isClient, surahId]);

  useEffect(() => {
    return () => {
      revokeRef.current?.();
    };
  }, []);

  const prepareSource = async (): Promise<string | null> => {
    if (!databaseAudioUrl || !reciter?.code) return null;

    revokeRef.current?.();
    revokeRef.current = null;

    const local = await resolveQuranAudio(surahId, reciter.code);
    if (local) {
      if (local.revoke) {
        revokeRef.current = () => URL.revokeObjectURL(local.url);
      }
      setActiveSourceUrl(local.url);
      return local.url;
    }

    setActiveSourceUrl(databaseAudioUrl);
    return databaseAudioUrl;
  };

  const togglePlay = async () => {
    if (!isClient) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const source = await prepareSource();
      if (!source) {
        setError(t("لا توجد تلاوة متاحة حاليًا.", "No recitation is available right now."));
        return;
      }
      if (audio.src !== source) {
        audio.src = source;
        audio.load();
      }
      await audio.play();
      setIsPlaying(true);
      setError(null);
    } catch (playError) {
      console.error("[audio] Playback failed:", playError);
      setIsPlaying(false);
      setError(t("تعذر تشغيل التلاوة. اضغط تشغيل مرة أخرى.", "Could not play the recitation. Press play again."));
    }
  };

  const download = async () => {
    if (!databaseAudioUrl || !reciter?.code || isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(null);
      setError(null);
      await downloadQuranAudio(
        databaseAudioUrl,
        surahId,
        reciter.code,
        (progress) => setDownloadProgress(progress),
      );
      setOfflineReady(true);
      setDownloadProgress(100);
    } catch (downloadError) {
      console.error("[audio] Offline download failed:", downloadError);
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : t("تعذر حفظ التلاوة على الجهاز.", "Could not save the recitation to this device."),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const removeDownload = async () => {
    if (!reciter?.code) return;
    try {
      await removeQuranAudio(surahId, reciter.code);
      setOfflineReady(false);
      setDownloadProgress(null);
    } catch {
      setError(t("تعذر حذف التلاوة من الجهاز.", "Could not remove the recitation from this device."));
    }
  };

  const toggleFavorite = async () => {
    const itemRef = `surah:${surahId}`;
    const nextSaved = favoriteState !== "saved";
    setFavoriteState(nextSaved ? "saved" : "not-saved");

    try {
      const response = nextSaved
        ? await fetch("/api/user/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_type: "quran", item_ref: itemRef }),
          })
        : await fetch(
            `/api/user/favorites?item_type=quran&item_ref=${encodeURIComponent(itemRef)}`,
            { method: "DELETE" },
          );

      if (!response.ok) throw new Error("favorite request failed");
    } catch {
      setFavoriteState(nextSaved ? "not-saved" : "saved");
      setError(
        nextSaved
          ? t("سجّل الدخول أولًا لحفظ السورة في مفضلاتك.", "Sign in first to save this surah to your favorites.")
          : t("تعذر تحديث المفضلة.", "Could not update favorites."),
      );
    }
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(event.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleReciterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newReciter =
      availableReciters.find((item) => item.id === event.target.value) ||
      availableReciters[0];
    if (!newReciter) return;

    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setReciter(newReciter);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveSourceUrl(null);
  };

  const formatTime = (value: number) => {
    if (!value || !Number.isFinite(value)) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  if (!isClient) return null;

  if (!reciter) {
    return (
      <div className="rounded-xl border border-brand-gold/20 bg-black/20 p-4 animate-pulse">
        <div className="mb-3 h-4 w-24 rounded bg-brand-gold/10" />
        <div className="h-10 w-full rounded-lg bg-brand-gold/10" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-gold/25 bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-brand-cream/50">{t("تلاوة السورة كاملة", "Full surah recitation")}</p>
          <p className="mt-1 font-semibold text-brand-cream">{isEnglish ? reciter.nameEn || reciter.nameAr : reciter.nameAr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void toggleFavorite()}
            className="border border-brand-gold/20 px-3"
            aria-label={t("حفظ السورة في المفضلة", "Save surah to favorites")}
          >
            {favoriteState === "saved" ? t("★ محفوظة", "★ Saved") : t("☆ مفضلة", "☆ Favorite")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm text-brand-cream/60" htmlFor={`reciter-${surahId}`}>
          {t("القارئ", "Reciter")}
        </label>
        <select
          id={`reciter-${surahId}`}
          className="w-full rounded-xl border border-brand-gold/20 bg-black/30 p-3 text-brand-cream focus:border-brand-gold focus:outline-none"
          value={reciter.id}
          onChange={handleReciterChange}
        >
          {availableReciters.map((item) => (
            <option key={item.id} value={item.id} className="bg-brand-emeraldDeep">
              {isEnglish ? item.nameEn || item.nameAr : item.nameAr}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void togglePlay()}
            disabled={isLoading || !databaseAudioUrl}
            className="min-w-28"
          >
            {isLoading ? t("جاري التحضير...", "Preparing...") : isPlaying ? t("إيقاف", "Pause") : t("تشغيل", "Play")}
          </Button>

          {!offlineReady ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void download()}
              disabled={isDownloading || !databaseAudioUrl}
              className="min-w-36"
            >
              {isDownloading
                ? downloadProgress === null
                  ? t("جاري الحفظ...", "Saving...")
                  : (isEnglish ? `Saving ${downloadProgress}%` : `جاري الحفظ ${downloadProgress}%`)
                : t("حفظ بدون إنترنت", "Save for offline")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void removeDownload()}
              className="min-w-36 border border-emerald-400/20 text-emerald-200"
            >
              {t("✓ محفوظ على الجهاز", "✓ Saved on this device")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-gold/20"
            aria-label={t("موضع التلاوة", "Playback position")}
          />
        </div>

        <div className="flex justify-between text-xs arabic-muted">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        src={activeSourceUrl ?? undefined}
        className="hidden"
        controlsList="nodownload"
      />

      <p className="text-center text-xs leading-6 text-brand-cream/45">
        {t(
          "عند حفظ السورة، تصبح التلاوة متاحة من مساحة جهازك حتى عند انقطاع الإنترنت. ملفات الصوت لا تُرفع إلى تخزين Supabase الخاص بالمشروع.",
          "When you save a surah, the recitation stays available from your device even offline. Audio files are not uploaded to the project's Supabase storage.",
        )}
      </p>
    </div>
  );
}
