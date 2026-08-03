import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SectionTitle, Card } from "@/components/AppShell";
import { fetchSurahList } from "@/lib/quran-api";

export const Route = createFileRoute("/quran/")({
  head: () => ({
    meta: [
      { title: "Al Quran — Read, Listen, Translate & Tafseer | Raah e Hidayath" },
      { name: "description", content: "All 114 surahs with Arabic text, recitation audio, translation in many languages, tafseer and full explanation of every ayah." },
      { property: "og:title", content: "Al Quran — Raah e Hidayath" },
      { property: "og:description", content: "Read, listen and understand the complete Quran in your language." },
    ],
  }),
  component: QuranIndex,
});

function QuranIndex() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["surahs"], queryFn: fetchSurahList, staleTime: Infinity });

  const list = (data ?? []).filter(
    (s) =>
      !q ||
      s.englishName.toLowerCase().includes(q.toLowerCase()) ||
      s.englishNameTranslation.toLowerCase().includes(q.toLowerCase()) ||
      String(s.number) === q.trim(),
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Al Quran" subtitle="114 Surahs · Reading · Audio · Translation · Tafseer · Explanation" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/mushaf/$lines" params={{ lines: "13" }}>
          <Card className="h-full gradient-hero text-primary-foreground">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Full Quran</p>
            <p className="mt-1 font-display text-xl">13 Line Mushaf</p>
            <p className="text-xs text-primary-foreground/80">Indo-Pak layout · every page · with translation & audio</p>
          </Card>
        </Link>
        <Link to="/mushaf/$lines" params={{ lines: "15" }}>
          <Card className="h-full gradient-hero text-primary-foreground">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Full Quran</p>
            <p className="mt-1 font-display text-xl">15 Line Mushaf</p>
            <p className="text-xs text-primary-foreground/80">Madani 604 pages · with translation & audio</p>
          </Card>
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search surah by name or number…"
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft outline-none focus:shadow-glow"
      />

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl border border-border bg-card shimmer" />
          ))}
        </div>
      )}
      {error && <Card className="text-sm text-destructive">Couldn't load the surah list. Please retry.</Card>}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s, i) => (
          <Link
            key={s.number}
            to="/quran/$surahId"
            params={{ surahId: String(s.number) }}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            className="animate-rise group block focus-visible:outline-none"
          >
            <Card className="grid h-full min-h-[5.25rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-glow group-active:translate-y-0 group-active:scale-[0.985] group-focus-visible:shadow-glow sm:gap-4">
              <span className="relative grid size-11 shrink-0 place-items-center">
                <svg viewBox="0 0 40 40" className="absolute inset-0 size-full text-primary/25 transition-colors duration-200 group-hover:text-primary/50" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M20 2 34 10v20L20 38 6 30V10L20 2Z" strokeWidth="1.5" />
                  <path d="M20 6.5 30 12.2v15.6L20 33.5 10 27.8V12.2L20 6.5Z" strokeWidth="0.75" className="text-primary/40" />
                </svg>
                <span className="relative text-xs font-semibold tabular-nums text-primary">{s.number}</span>
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[0.95rem] font-semibold leading-tight">{s.englishName}</span>
                <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">
                  {s.englishNameTranslation}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] leading-none text-muted-foreground/80">
                  <span className="tabular-nums">{s.numberOfAyahs} ayahs</span>
                  <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/40" />
                  <span className="truncate">{s.revelationType}</span>
                </span>
              </span>

              <span
                dir="rtl"
                lang="ar"
                className="arabic-ayah max-w-[7.5rem] shrink-0 truncate text-right text-lg leading-[2] text-primary sm:max-w-[9rem] sm:text-xl"
              >
                {s.name}
              </span>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}