import { useCallback, useEffect, useState } from "react";

/**
 * Everything on the website that the admin can rewrite without touching code:
 * branding, page headings, the naats/nasheeds section copy, and the Spotify
 * playlists embedded on the nasheeds page.
 */

export type SpotifyEntry = {
  id: string;
  /** Spotify playlist / album / track id or a full open.spotify.com link. */
  uri: string;
  kind: "playlist" | "album" | "track" | "artist";
  title: string;
  note: string;
};

export type SiteConfig = {
  siteName: string;
  tagline: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  naatsTitle: string;
  naatsSubtitle: string;
  naatsIntro: string;
  naatsVerse: string;
  naatsVerseRef: string;
  spotify: SpotifyEntry[];
  footerNote: string;
  contactEmail: string;
  adminPin: string;
};

export const DEFAULT_SITE: SiteConfig = {
  siteName: "Raah e Hidayath",
  tagline: "The Path of Guidance",
  homeHeroTitle: "Everything in the app",
  homeHeroSubtitle: "Quran, Hadith, Ibadaat, Duas and more — in your language.",
  naatsTitle: "Naats & Nasheeds",
  naatsSubtitle: "100% human voices — no music, no instruments",
  naatsIntro:
    "Every track in this collection is sung by the human voice alone. No drums, no strings, no synths — only pure vocals praising Allah and sending salawat upon the Prophet ﷺ. Press play and listen right here.",
  naatsVerse: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ",
  naatsVerseRef:
    "\"Indeed, Allah and His angels send blessings upon the Prophet. O believers, send blessings upon him and greet him with peace.\" — Surah Al-Ahzab 33:56",
  spotify: [
    {
      id: "sp1",
      uri: "4SY9ZQfdNDYXcqWINnYPhG",
      kind: "playlist",
      title: "Arabic Nasheeds — Vocals Only",
      note: "الأناشيد العربية بدون موسيقى — a cappella Arabic nasheeds, voice only.",
    },
    {
      id: "sp2",
      uri: "3nhW6RVws0XDoupVDPdz2w",
      kind: "playlist",
      title: "Nasheeds 🕋 Vocals Only",
      note: "A long, calm collection of vocals-only nasheeds for daily listening.",
    },
    {
      id: "sp3",
      uri: "2zn6CaYjLxgHTTlJMMDgh3",
      kind: "playlist",
      title: "Nasheeds — No Music",
      note: "Gentle voice-only nasheeds, perfect for study and travel.",
    },
    {
      id: "sp4",
      uri: "4KxUF1EMW8rI3GnCJp2jrF",
      kind: "playlist",
      title: "Nasheeds (Vocals Only)",
      note: "Modern and classical naats sung purely with the human voice.",
    },
    {
      id: "sp5",
      uri: "51tD9kJZxBT3TqAk5WiYvK",
      kind: "playlist",
      title: "Siedd's Essentials — Vocals Only",
      note: "Well loved English nasheeds recorded completely without instruments.",
    },
    {
      id: "sp6",
      uri: "0PoBVIgjx8bhcWXimb5ybj",
      kind: "playlist",
      title: "Nasheeds Instead of Music",
      note: "A beautiful alternative to music — human voices only, all day long.",
    },
  ],
  footerNote: "Made for the ummah — free, ad-free and always vocals-only.",
  contactEmail: "",
  adminPin: "",
};

export const SITE_KEY = "reh-site-config";

export function loadSite(): SiteConfig {
  if (typeof window === "undefined") return DEFAULT_SITE;
  try {
    const raw = window.localStorage.getItem(SITE_KEY);
    if (!raw) return DEFAULT_SITE;
    return { ...DEFAULT_SITE, ...(JSON.parse(raw) as Partial<SiteConfig>) };
  } catch {
    return DEFAULT_SITE;
  }
}

const listeners = new Set<(c: SiteConfig) => void>();

export function saveSite(next: SiteConfig) {
  try {
    window.localStorage.setItem(SITE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
}

export function useSiteConfig(): [SiteConfig, (next: SiteConfig) => void, () => void] {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE);

  useEffect(() => {
    setConfig(loadSite());
    const listener = (c: SiteConfig) => setConfig(c);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const save = useCallback((next: SiteConfig) => {
    saveSite(next);
    setConfig(next);
  }, []);

  const reset = useCallback(() => {
    saveSite(DEFAULT_SITE);
    setConfig(DEFAULT_SITE);
  }, []);

  return [config, save, reset];
}

/** Turns a Spotify link, uri or bare id into an embeddable player URL. */
export function spotifyEmbed(entry: { uri: string; kind: SpotifyEntry["kind"] }): {
  embed: string;
  open: string;
} | null {
  const raw = entry.uri.trim();
  if (!raw) return null;
  const linkMatch = raw.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/);
  const uriMatch = raw.match(/^spotify:(playlist|album|track|artist|episode|show):([A-Za-z0-9]+)$/);
  const bare = /^[A-Za-z0-9]{16,30}$/.test(raw) ? raw : null;
  const kind = linkMatch?.[1] ?? uriMatch?.[1] ?? entry.kind;
  const id = linkMatch?.[2] ?? uriMatch?.[2] ?? bare;
  if (!id) return null;
  return {
    embed: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
    open: `https://open.spotify.com/${kind}/${id}`,
  };
}
