import { useEffect, useState } from "react";

/** Admin-controlled feature visibility. Stored on this device under FEATURES_KEY;
 *  every page of the app — bottom navigation, the home Explore grid and every
 *  More-page link — can be switched on or off from the admin panel. */
export const FEATURES_KEY = "reh-feature-flags";

export const FEATURE_META = [
  /* main navigation */
  { to: "/quran", label: "Al Quran", group: "Main" },
  { to: "/mushaf/13", label: "13 Line Quran", group: "Main" },
  { to: "/mushaf/15", label: "15 Line Quran", group: "Main" },
  { to: "/hadith", label: "Hadith", group: "Main" },
  { to: "/ibadaat", label: "Ibadaat", group: "Main" },
  { to: "/more", label: "More page", group: "Main" },
  /* tools */
  { to: "/qibla", label: "Qibla Direction", group: "Tools" },
  { to: "/names", label: "99 Names of Allah", group: "Tools" },
  { to: "/naats", label: "Naats & Salawat", group: "Tools" },
  { to: "/scanner", label: "Barcode Scanner", group: "Tools" },
  { to: "/halal", label: "Halal or Haram", group: "Tools" },
  { to: "/prophets", label: "Prophets & Families", group: "Tools" },
  { to: "/tasbeeh", label: "Digital Tasbeeh", group: "Tools" },
  { to: "/duas", label: "Duas & Azkar", group: "Tools" },
  { to: "/ramadan", label: "Ramadan & Fasting", group: "Tools" },
  { to: "/zakat", label: "Zakat Calculator", group: "Tools" },
  { to: "/quiz", label: "Islamic Quiz", group: "Tools" },
  { to: "/wheel", label: "Good Deed Wheel", group: "Tools" },
  { to: "/qaida", label: "Noorani Qaida", group: "Tools" },
  { to: "/seerah", label: "Seerat un Nabi", group: "Tools" },
  { to: "/calendar", label: "Hijri Calendar", group: "Tools" },
  { to: "/tracker", label: "Salah Tracker", group: "Tools" },
  { to: "/tree", label: "The Ibadah Tree", group: "Tools" },
  { to: "/search", label: "Search", group: "Tools" },
  { to: "/ai", label: "Islamic AI", group: "Tools" },
  { to: "/settings", label: "Settings", group: "Tools" },
  /* home page blocks */
  { to: "home:hero", label: "Home — Bismillah hero", group: "Home page" },
  { to: "home:search", label: "Home — Search bar", group: "Home page" },
  { to: "home:mushaf", label: "Home — Mushaf cards", group: "Home page" },
  { to: "home:prayer", label: "Home — Prayer times", group: "Home page" },
  { to: "home:explore", label: "Home — Explore grid", group: "Home page" },
  { to: "home:credits", label: "Home — Credits footer", group: "Home page" },
] as const;

export type FeatureFlags = Record<string, boolean>;

export function defaultFeatureFlags(): FeatureFlags {
  return Object.fromEntries(FEATURE_META.map((f) => [f.to, true]));
}

export function featureRoutes(): readonly string[] {
  return FEATURE_META.map((f) => f.to);
}

/* ---------------- reactive store so every page reacts instantly ---------------- */

let current: FeatureFlags | null = null;
const listeners = new Set<() => void>();

export function readFlags(): FeatureFlags {
  if (current) return current;
  let stored: FeatureFlags = {};
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(FEATURES_KEY) : null;
    if (raw) stored = JSON.parse(raw) as FeatureFlags;
  } catch {
    /* ignore */
  }
  current = { ...defaultFeatureFlags(), ...stored };
  return current;
}

export function writeFlags(next: FeatureFlags) {
  current = { ...defaultFeatureFlags(), ...next };
  try {
    window.localStorage.setItem(FEATURES_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Reads flags after mount (SSR-safe) and re-renders when the admin changes them. */
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);

  useEffect(() => {
    const sync = () => setFlags({ ...readFlags() });
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return flags;
}

export const isOn = (flags: FeatureFlags, key: string) => flags[key] !== false;
