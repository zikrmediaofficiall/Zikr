const METHOD_IDS: Record<string, number> = {
  "umm-al-qura": 4,
  mwl: 3,
  isna: 2,
  egyptian: 5,
  karachi: 1,
  tehran: 7,
  jafari: 0,
  gulf: 8,
  "gulf-region": 8,
  qatar: 10,
  kuwait: 9,
  dubai: 16,
  turkey: 13,
};

/**
 * Resolve persisted prayer preference names to the live Aladhan method IDs.
 * Unknown legacy values intentionally fall back to the app's Umm al-Qura default.
 */
export function getPrayerCalculationMethodId(value: string | null): number {
  const normalized = (value ?? "umm-al-qura").trim().toLowerCase();
  return METHOD_IDS[normalized] ?? 4;
}
