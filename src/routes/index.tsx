import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Compass, Ellipsis, Heart, ListChecks, MessageCircleHeart, Scroll,
  Sparkle, Star, Baby, CalendarDays, BookMarked, LayoutGrid, TreeDeciduous, Users,
} from "lucide-react";
import { Card } from "@/components/AppShell";
import { AiLogo } from "@/components/AiLogo";
import { useSettings } from "@/lib/settings";
import { fetchPrayerTimes } from "@/lib/quran-api";
import { CREATORS } from "@/lib/islamic-data";
import { SearchBar } from "@/components/SearchBar";
import { useFeatureFlags, isOn } from "@/lib/feature-flags";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raah e Hidayath — Complete Islamic App" },
      { name: "description", content: "Quran with audio, translation and tafseer, hadith books, prayer times, Qibla, duas and Islamic learning in many languages." },
      { property: "og:title", content: "Raah e Hidayath — Complete Islamic App" },
      { property: "og:description", content: "Quran with audio, translation and tafseer, hadith books, prayer times, Qibla, duas and Islamic learning in many languages." },
    ],
  }),
  component: Index,
});

const PRAYERS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

const QUICK = [
  { to: "/quran", label: "Al Quran", icon: BookOpen, note: "Read · Listen · Tafseer" },
  { to: "/mushaf/13", label: "13 Line Quran", icon: BookMarked, note: "Full mushaf + translation" },
  { to: "/mushaf/15", label: "15 Line Quran", icon: LayoutGrid, note: "Madani 604 pages" },
  { to: "/hadith", label: "Hadith", icon: Scroll, note: "All major books" },
  { to: "/qibla", label: "Qibla", icon: Compass, note: "Live direction" },
  { to: "/names", label: "99 Names", icon: Star, note: "Asma ul Husna" },
  { to: "/tasbeeh", label: "Tasbeeh", icon: ListChecks, note: "Digital counter" },
  { to: "/duas", label: "Duas", icon: Heart, note: "With meaning" },
  { to: "/qaida", label: "Noorani Qaida", icon: Baby, note: "Learn to read" },
  { to: "/seerah", label: "Seerat un Nabi ﷺ", icon: Sparkle, note: "Life & family" },
  { to: "/calendar", label: "Hijri Calendar", icon: CalendarDays, note: "Islamic dates" },
  { to: "/tree", label: "Ibadah Tree", icon: TreeDeciduous, note: "Grow with every deed" },
  { to: "/tracker", label: "Salah Tracker", icon: MessageCircleHeart, note: "Daily habit" },
  { to: "/ai", label: "Noor AI", icon: AiLogo, note: "Your Islamic companion" },
  { to: "/family", label: "Family Connect", icon: Users, note: "Worship together" },
  { to: "/more", label: "More", icon: Ellipsis, note: "Everything else" },
];

function Index() {
  const { settings } = useSettings();
  const flags = useFeatureFlags();
  const { data, isLoading, error } = useQuery({
    queryKey: ["times", settings.city, settings.country, settings.method],
    queryFn: () => fetchPrayerTimes(settings.city, settings.country, settings.method),
    staleTime: 1000 * 60 * 30,
  });

  return (
    <div className="space-y-8">
      {isOn(flags, "home:hero") && (
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 text-primary-foreground shadow-glow animate-rise sm:p-9">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-accent/20 blur-2xl animate-float" aria-hidden />
        <svg aria-hidden viewBox="0 0 100 100" className="absolute -bottom-10 -left-8 size-56 text-accent/20 animate-spin-slow" fill="none" stroke="currentColor">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="25" y="25" width="50" height="50" transform={`rotate(${i * 11} 50 50)`} strokeWidth="0.6" />
          ))}
        </svg>
        <p className="relative text-xs uppercase tracking-[0.3em] text-accent">Bismillah</p>
        <p className="relative mt-3 arabic-ayah text-3xl text-accent sm:text-4xl">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
        <h2 className="relative mt-4 font-display text-2xl sm:text-3xl">Raah e Hidayath — The Path of Guidance</h2>
        <p className="relative mt-2 max-w-lg text-sm text-primary-foreground/80">
          The complete Quran with recitation, translation, tafseer and explanation, every major hadith collection,
          prayer times and daily worship — in your language.
        </p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Link to="/quran" className="rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-soft transition hover:brightness-105">
            Open the Quran
          </Link>
          <Link to="/hadith" className="rounded-full border border-accent/40 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10">
            Browse Hadith
          </Link>
        </div>
      </section>
      )}

      {isOn(flags, "home:search") && <SearchBar />}

      {isOn(flags, "home:mushaf") && (
      <section className="space-y-3">
        <h3 className="font-display text-xl">Read the full Mushaf</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/mushaf/$lines" params={{ lines: "13" }}>
            <Card className="h-full">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Indo-Pak</p>
              <p className="mt-1 font-display text-xl">13 Line Quran</p>
              <p className="text-xs text-muted-foreground">One mushaf page per screen · pure reading</p>
            </Card>
          </Link>
          <Link to="/mushaf/$lines" params={{ lines: "15" }}>
            <Card className="h-full">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Madani</p>
              <p className="mt-1 font-display text-xl">15 Line Quran</p>
              <p className="text-xs text-muted-foreground">All 604 pages · one page per screen</p>
            </Card>
          </Link>
        </div>
      </section>
      )}

      {isOn(flags, "home:prayer") && (
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-xl">Today's Prayer Times</h3>
          <span className="text-xs text-muted-foreground">
            {settings.city}, {settings.country}
          </span>
        </div>
        {isLoading && <div className="h-24 rounded-2xl border border-border bg-card shimmer" />}
        {error && <Card className="text-sm text-destructive">Couldn't load prayer times. Check your city in Settings.</Card>}
        {data && (
          <Card className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {data.date.readable} · {data.date.hijri.day} {data.date.hijri.month.en} {data.date.hijri.year} AH
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {PRAYERS.map((p, i) => (
                <div
                  key={p}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-rise rounded-xl border border-border/70 bg-secondary/50 p-3 text-center"
                >
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{p}</p>
                  <p className="mt-1 font-semibold text-primary">{data.timings[p]?.slice(0, 5)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
      )}

      {isOn(flags, "home:explore") && (
      <section className="space-y-3">
        <h3 className="font-display text-xl">Explore</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK.filter((item) => isOn(flags, item.to)).map(({ to, label, icon: Icon, note }, i) => (
            <Link key={to + label} to={to} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise">
              <Card className="group h-full">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{note}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      )}

      {isOn(flags, "home:credits") && (
      <footer className="rounded-2xl border border-border/70 bg-card p-5 text-center text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground">Created by</p>
        <p className="mt-1">{CREATORS.join(" · ")}</p>
        <Link to="/admin" className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline">
          Admin panel
        </Link>
      </footer>
      )}
    </div>
  );
}
