/**
 * Shared real-audio playback helpers for adhan, dhikr and salawat.
 * A missing recording remains silent rather than substituting an unrelated beep.
 */

import { getAudioUrl, loadAudioSettings } from "@/lib/audio/config";

let ctx: AudioContext | null = null;
let masterVolume = 0.7;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function unlockAudioContext(): void {
  const context = getCtx();
  if (!context) return;
  if (context.state === "suspended") context.resume().catch(() => {});
}

export function isAudioUnlocked(): boolean {
  const context = getCtx();
  return !!context && context.state === "running";
}

export function setToneVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
}

export function getToneVolume(): number {
  return masterVolume;
}

export const AZAN_CLIP_URL = "/audio/adhan.m4a";
export const SALAWAT_CLIP_URL = "/audio/salawat.m4a";

let azanEl: HTMLAudioElement | null = null;
let dhikrEl: HTMLAudioElement | null = null;
let salawatEl: HTMLAudioElement | null = null;
let refreshRequest: Promise<void> | null = null;

export function refreshSiteAudio(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!refreshRequest) {
    refreshRequest = loadAudioSettings()
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

function configure(
  el: HTMLAudioElement,
  slot: "prayer" | "dhikr" | "salawat",
): HTMLAudioElement {
  const nextUrl = getAudioUrl(slot);
  const absoluteUrl = new URL(nextUrl, window.location.href).href;
  if (el.src !== absoluteUrl) el.src = nextUrl;
  el.preload = "none";
  el.volume = masterVolume;
  return el;
}

function getClipEl(kind: "azan" | "dhikr" | "salawat"): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (kind === "azan") {
    if (!azanEl) azanEl = new Audio();
    return configure(azanEl, "prayer");
  }
  if (kind === "dhikr") {
    if (!dhikrEl) dhikrEl = new Audio();
    return configure(dhikrEl, "dhikr");
  }
  if (!salawatEl) salawatEl = new Audio();
  return configure(salawatEl, "salawat");
}

export function playAzanClip(): void {
  const el = getClipEl("azan");
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {
    // Do not substitute a generic synthesized tone for a real adhan recording.
  });
}

export function stopAzanClip(): void {
  if (azanEl) {
    azanEl.pause();
    azanEl.currentTime = 0;
  }
}

export function playDhikrClip(): void {
  const el = getClipEl("dhikr");
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {
    // A missing dhikr recording must not play salawat or an unrelated tone.
  });
}

export function playSalawatClip(): void {
  const el = getClipEl("salawat");
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {
    // Keep the reminder available without misrepresenting a synthetic tone.
  });
}

export function stopSalawatClip(): void {
  if (salawatEl) {
    salawatEl.pause();
    salawatEl.currentTime = 0;
  }
}

