import { supabase } from "@/integrations/supabase/client";

export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type Prayer = (typeof PRAYERS)[number];

const TRACKER_KEY = "reh-salah-tracker";
const DHIKR_KEY = "reh-family-dhikr";
const QURAN_KEY = "reh-family-quran";

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayIso = () => iso(new Date());

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(iso(d));
  }
  return out;
}

export type MemberProgress = {
  user_id: string;
  day: string;
  prayers: string[];
  quran_pages: number;
  dhikr: number;
  streak: number;
  updated_at: string;
};

export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  share_salah: boolean;
  share_quran: boolean;
  share_dhikr: boolean;
  share_streak: boolean;
  share_last_active: boolean;
  hide_prayer_times: boolean;
  joined_at: string;
};

export type PrivacyKey =
  | "share_salah"
  | "share_quran"
  | "share_dhikr"
  | "share_streak"
  | "share_last_active"
  | "hide_prayer_times";

export const PRIVACY_OPTIONS: { key: PrivacyKey; label: string; note: string }[] = [
  { key: "share_salah", label: "Share Salah", note: "Which of the five prayers you completed today" },
  { key: "share_quran", label: "Share Quran", note: "Pages you read today" },
  { key: "share_dhikr", label: "Share Dhikr", note: "Your tasbeeh count" },
  { key: "share_streak", label: "Share Streak", note: "Your consistency streak in days" },
  { key: "share_last_active", label: "Share Last Active", note: "When you last opened the app" },
  { key: "hide_prayer_times", label: "Hide Individual Prayer Times", note: "Show only totals, never the exact times" },
];

export const ENCOURAGEMENTS = [
  "🌸 May Allah reward you.",
  "🤍 Keep going.",
  "🌙 Don't forget Asr.",
  "✨ MashaAllah.",
  "🤲 I'm making dua for you.",
  "❤️ Proud of your consistency.",
] as const;

/* ---------- local worship data (from the existing Salah Tracker) ---------- */

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function localStreak(log: Record<string, string[]>) {
  let streak = 0;
  const d = new Date();
  if ((log[iso(d)]?.length ?? 0) < 5) d.setDate(d.getDate() - 1);
  for (;;) {
    if ((log[iso(d)]?.length ?? 0) >= 5) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function readLocalToday() {
  const log = readJson<Record<string, string[]>>(TRACKER_KEY, {});
  const day = todayIso();
  return {
    day,
    prayers: log[day] ?? [],
    streak: localStreak(log),
    quran_pages: Number(readJson<Record<string, number>>(QURAN_KEY, {})[day] ?? 0),
    dhikr: Number(readJson<Record<string, number>>(DHIKR_KEY, {})[day] ?? 0),
  };
}

export function bumpLocal(kind: "quran" | "dhikr", amount: number) {
  const key = kind === "quran" ? QURAN_KEY : DHIKR_KEY;
  const day = todayIso();
  const store = readJson<Record<string, number>>(key, {});
  store[day] = Math.max(0, (store[day] ?? 0) + amount);
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    /* storage full or blocked */
  }
  return store[day];
}

/** Push this device's worship log for today into the shared family view. */
export async function syncMyProgress(userId: string) {
  const t = readLocalToday();
  await supabase.from("daily_progress").upsert(
    {
      user_id: userId,
      day: t.day,
      prayers: t.prayers,
      quran_pages: t.quran_pages,
      dhikr: t.dhikr,
      streak: t.streak,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day" },
  );
  await supabase.from("profiles").update({ last_active: new Date().toISOString() }).eq("id", userId);
}

/* ---------- helpers ---------- */

export function makeInviteCode(familyName: string) {
  const base =
    familyName
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 8)
      .toUpperCase() || "FAMILY";
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${base}-${digits}`;
}

export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export type Badge = { id: string; label: string; icon: string; earned: boolean; note: string };

export function badgesFor(streak: number, weekPrayers: number, quranPages: number, dhikr: number): Badge[] {
  return [
    { id: "week", label: "First Week Complete", icon: "🏆", earned: streak >= 7, note: "7 days in a row" },
    { id: "ramadan", label: "Ramadan Warrior", icon: "🌙", earned: streak >= 30, note: "30 days of consistency" },
    { id: "quran", label: "Quran Lover", icon: "📖", earned: quranPages >= 30, note: "30 pages this week" },
    { id: "salah", label: "Salah Guardian", icon: "🤲", earned: weekPrayers >= 30, note: "30 prayers this week" },
    { id: "hundred", label: "100 Day Streak", icon: "🔥", earned: streak >= 100, note: "100 days in a row" },
    { id: "barakah", label: "Family of Barakah", icon: "🌸", earned: dhikr >= 1000, note: "1000 dhikr together" },
  ];
}
