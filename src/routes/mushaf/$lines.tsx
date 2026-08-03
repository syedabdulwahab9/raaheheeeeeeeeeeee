import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkCheck, ChevronLeft, ChevronRight, Clock, Download, Settings2, Target, X,
} from "lucide-react";
import { Card } from "@/components/AppShell";
import { useSettings } from "@/lib/settings";
import { buildPages, downloadForOffline, fetchFullQuran, fetchTransliteration } from "@/lib/mushaf";
import {
  AUDIO_QUALITIES, getLanguage, RECITERS, TAFSIRS, TAJWEED_COLORS, TRANSLATIONS, VOICE_PROFILES,
} from "@/lib/islamic-data";

export const Route = createFileRoute("/mushaf/$lines")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.lines} Line Quran — One Mushaf Page per Screen | Raah e Hidayath` },
      {
        name: "description",
        content: `Read the complete Quran in the ${params.lines} line mushaf layout. Exactly one printed Quran page on one page of the site, with fast smooth page turning and full reading controls.`,
      },
      { property: "og:title", content: `${params.lines} Line Quran | Raah e Hidayath` },
      { property: "og:description", content: "The complete mushaf — one page per screen, pure reading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MushafReader,
});

const today = () => new Date().toISOString().slice(0, 10);

function MushafReader() {
  const { lines: linesParam } = Route.useParams();
  const lines: 13 | 15 = linesParam === "13" ? 13 : 15;
  const { settings, update, pushHistory } = useSettings();
  const lang = getLanguage(settings.lang);
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const touchX = useRef<number | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["full-quran", settings.lang, settings.translationEdition],
    queryFn: () => fetchFullQuran(settings.lang, settings.translationEdition),
    staleTime: Infinity,
  });

  const { data: translit } = useQuery({
    queryKey: ["translit"],
    queryFn: fetchTransliteration,
    enabled: settings.showTransliteration,
    staleTime: Infinity,
  });

  const pages = useMemo(() => buildPages(data ?? [], lines), [data, lines]);
  const total = pages.length;
  const current = pages[page - 1];

  /* Resume exactly where the reader left off. */
  useEffect(() => {
    if (settings.autoBookmark && settings.lastRead?.lines === lines) {
      setPage(Math.max(1, settings.lastRead.page));
    } else {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const go = useCallback(
    (next: number) => {
      if (!total) return;
      const clamped = Math.min(Math.max(1, next), total);
      setPage(clamped);
      setRevealed({});
      frameRef.current?.scrollIntoView({ behavior: settings.autoScroll ? "smooth" : "auto", block: "start" });
    },
    [total, settings.autoScroll],
  );

  /* Bookmark, history and daily goal tracking. */
  useEffect(() => {
    if (!current) return;
    const patch: Parameters<typeof update>[0] = {};
    if (settings.autoBookmark) patch.lastRead = { lines, page };
    const stamp = today();
    const read = settings.readToday.date === stamp ? settings.readToday : { date: stamp, pages: 0 };
    patch.readToday = { date: stamp, pages: read.pages + 1 };
    update(patch);
    pushHistory({
      label: `${lines} line mushaf · page ${page} · ${current.ayahs[0]?.surahEnglish ?? ""}`,
      href: `/mushaf/${lines}?p=${page}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lines, total]);

  /* Fast, smooth turning: arrow keys + swipe. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(page + 1);
      if (e.key === "ArrowRight") go(page - 1);
      if (e.key === "PageDown") go(page + 1);
      if (e.key === "PageUp") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, go]);

  /* Daily verse notification. */
  useEffect(() => {
    if (!settings.dailyVerseNotifications || !data?.length) return;
    if (typeof Notification === "undefined") return;
    const key = "reh-daily-verse";
    if (localStorage.getItem(key) === today()) return;
    const send = () => {
      const ayah = data[Math.floor(Math.random() * data.length)];
      if (!ayah) return;
      new Notification("Ayah of the day — Raah e Hidayath", {
        body: `${ayah.surahEnglish} ${ayah.surah}:${ayah.numberInSurah}\n${ayah.translation.slice(0, 160)}`,
      });
      localStorage.setItem(key, today());
    };
    if (Notification.permission === "granted") send();
    else if (Notification.permission === "default") void Notification.requestPermission().then((p) => p === "granted" && send());
  }, [settings.dailyVerseNotifications, data]);

  const surahJump = useMemo(() => {
    const map = new Map<number, { name: string; page: number }>();
    pages.forEach((p, idx) => {
      for (const a of p.ayahs) if (!map.has(a.surah)) map.set(a.surah, { name: a.surahEnglish, page: idx + 1 });
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [pages]);

  const startOffline = async () => {
    setDownloading(true);
    try {
      await downloadForOffline(settings.lang, settings.translationEdition);
      update({ offlineDownloads: true });
    } finally {
      setDownloading(false);
    }
  };

  const goalDone = settings.readToday.date === today() ? settings.readToday.pages : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/quran" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4" /> Quran
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/mushaf/$lines"
            params={{ lines: "13" }}
            className={`rounded-full border px-3 py-1 ${lines === 13 ? "border-transparent gradient-hero text-primary-foreground" : "border-border"}`}
          >
            13 Lines
          </Link>
          <Link
            to="/mushaf/$lines"
            params={{ lines: "15" }}
            className={`rounded-full border px-3 py-1 ${lines === 15 ? "border-transparent gradient-hero text-primary-foreground" : "border-border"}`}
          >
            15 Lines
          </Link>
          <button
            onClick={() => setPanel(true)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:text-primary"
          >
            <Settings2 className="size-3.5" /> Options
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
        <h1 className="font-display text-xl">{lines} Line Quran</h1>
        <span className="text-xs text-muted-foreground">
          {lines === 15 ? "Madani mushaf" : "Indo-Pak mushaf"} · {total || "…"} pages · reading only
        </span>
      </div>

      {/* --- page controls --- */}
      <Card className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 disabled:opacity-40"
        >
          <ChevronRight className="size-4" /> Previous
        </button>
        <input
          type="number"
          min={1}
          max={Math.max(total, 1)}
          value={page}
          onChange={(e) => go(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-center"
          aria-label="Page number"
        />
        <span className="text-xs text-muted-foreground">/ {total || "…"}</span>
        <select
          value=""
          onChange={(e) => e.target.value && go(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          aria-label="Jump to surah"
        >
          <option value="">Jump to surah…</option>
          {surahJump.map(([num, s]) => (
            <option key={num} value={s.page}>
              {num}. {s.name}
            </option>
          ))}
        </select>
        <button
          disabled={page >= total}
          onClick={() => go(page + 1)}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 disabled:opacity-40"
        >
          Next <ChevronLeft className="size-4" />
        </button>
      </Card>

      {isLoading && <div className="h-[32rem] rounded-3xl border border-border bg-card shimmer" />}
      {error && <Card className="text-sm text-destructive">Couldn't load the mushaf. Please retry.</Card>}

      {/* --- one Quran page, exactly one page of the site --- */}
      {current && (
        <div
          ref={frameRef}
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX ?? null;
            if (start === null || end === null) return;
            const dx = end - start;
            if (Math.abs(dx) > 55) go(dx < 0 ? page + 1 : page - 1);
            touchX.current = null;
          }}
          className={`mushaf-frame bg-card p-4 sm:p-7 ${settings.memorization ? "memorize" : ""} ${
            settings.tajweedColors ? "tajweed-on" : ""
          } ${settings.animation === "none" ? "" : "animate-rise"}`}
          key={page}
        >
          <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>{current.ayahs[0]?.surahEnglish}</span>
            <span>Juz {current.ayahs[0]?.juz}</span>
            <span>Page {page}</span>
          </div>

          <div dir="rtl" className="quran-page-text text-justify">
            <p style={{ fontSize: `${settings.arabicSize}px` }}>
              {current.ayahs.map((a, i) => (
                <span
                  key={`a-${a.number}-${i}`}
                  className={`${settings.memorization ? "memo-line" : ""} ${revealed[a.number] ? "revealed" : ""}`}
                  onClick={() => settings.memorization && setRevealed((r) => ({ ...r, [a.number]: !r[a.number] }))}
                >
                  {settings.wordByWord
                    ? a.arabic.split(" ").map((w, wi) => (
                        <span key={wi} className="wbw-word" title={`${a.surahEnglish} ${a.surah}:${a.numberInSurah}`}>
                          {w}{" "}
                        </span>
                      ))
                    : `${a.arabic} `}
                  <span className="inline-block align-middle text-[0.6em] text-primary">﴿{a.numberInSurah}﴾</span>{" "}
                </span>
              ))}
            </p>
          </div>

          {settings.showTransliteration && translit && (
            <div className="mt-5 space-y-1 border-t border-border/60 pt-4 text-sm italic text-muted-foreground">
              {current.ayahs.map((a) => (
                <p key={`tl-${a.number}`}>
                  <span className="not-italic text-primary">{a.numberInSurah}.</span> {translit.get(a.number)}
                </p>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <button disabled={page <= 1} onClick={() => go(page - 1)} className="hover:text-primary disabled:opacity-40">
              ‹ Previous page
            </button>
            <span>
              {lines} lines · {page} / {total}
            </span>
            <button disabled={page >= total} onClick={() => go(page + 1)} className="hover:text-primary disabled:opacity-40">
              Next page ›
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Swipe left or right, or use the ← → keys, to turn pages instantly. Translation, tafseer and audio live in
        the Quran section so this mushaf stays pure reading.
      </p>

      {/* --- options panel --- */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setPanel(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-glow sm:rounded-l-3xl"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg">Reading options</p>
              <button onClick={() => setPanel(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <Field label="Preferred translation">
                <select
                  value={settings.translationEdition}
                  onChange={(e) => update({ translationEdition: e.target.value })}
                  className={inputClass}
                >
                  <option value="auto">Automatic — {lang.label} default</option>
                  {TRANSLATIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.lang.toUpperCase()})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Preferred tafsir">
                <select value={settings.tafsirSlug} onChange={(e) => update({ tafsirSlug: e.target.value })} className={inputClass}>
                  <option value="auto">Automatic — {lang.label} default</option>
                  {TAFSIRS.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name} ({t.lang.toUpperCase()})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Preferred reciter">
                <select value={settings.reciter} onChange={(e) => update({ reciter: e.target.value })} className={inputClass}>
                  {RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.style}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Narration voice">
                <select value={settings.voiceProfile} onChange={(e) => update({ voiceProfile: e.target.value })} className={inputClass}>
                  {VOICE_PROFILES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Audio quality">
                <select
                  value={settings.audioQuality}
                  onChange={(e) => update({ audioQuality: Number(e.target.value) as 32 | 64 | 128 | 192 })}
                  className={inputClass}
                >
                  {AUDIO_QUALITIES.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Playback speed — ${settings.playbackSpeed.toFixed(2)}×`}>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={settings.playbackSpeed}
                  onChange={(e) => update({ playbackSpeed: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Field>

              <Field label={`Repeat each verse — ${settings.repeatVerses}×`}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={settings.repeatVerses}
                  onChange={(e) => update({ repeatVerses: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Field>

              <Toggle label="Auto-scroll" on={settings.autoScroll} set={(v) => update({ autoScroll: v })} />
              <Toggle label="Tajweed colours" on={settings.tajweedColors} set={(v) => update({ tajweedColors: v })} />
              <Toggle label="Transliteration" on={settings.showTransliteration} set={(v) => update({ showTransliteration: v })} />
              <Toggle label="Word-by-word mode" on={settings.wordByWord} set={(v) => update({ wordByWord: v })} />
              <Toggle
                label="Memorization mode"
                hint="Text is hidden until you tap it"
                on={settings.memorization}
                set={(v) => update({ memorization: v })}
              />
              <Toggle label="Auto-bookmark last read" on={settings.autoBookmark} set={(v) => update({ autoBookmark: v })} />
              <Toggle label="Keep reading history" on={settings.keepHistory} set={(v) => update({ keepHistory: v })} />
              <Toggle
                label="Daily verse notifications"
                on={settings.dailyVerseNotifications}
                set={(v) => update({ dailyVerseNotifications: v })}
              />

              <Field label={`Daily reading goal — ${settings.dailyGoalPages} pages`}>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={settings.dailyGoalPages}
                  onChange={(e) => update({ dailyGoalPages: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="size-3.5 text-primary" />
                  {goalDone} / {settings.dailyGoalPages} pages today
                  <span className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full gradient-hero"
                      style={{ width: `${Math.min(100, (goalDone / settings.dailyGoalPages) * 100)}%` }}
                    />
                  </span>
                </div>
              </Field>

              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-2 font-medium">
                  <Download className="size-4 text-primary" /> Offline download
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save the whole Quran with your chosen translation on this device.
                </p>
                <button
                  onClick={startOffline}
                  disabled={downloading}
                  className="mt-2 rounded-full gradient-hero px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {downloading ? "Downloading…" : settings.offlineDownloads ? "Update offline copy" : "Download for offline"}
                </button>
              </div>

              {settings.lastRead && (
                <div className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 font-medium">
                    <BookmarkCheck className="size-4 text-primary" /> Last read
                  </p>
                  <button
                    onClick={() => {
                      go(settings.lastRead!.page);
                      setPanel(false);
                    }}
                    className="mt-1 text-xs text-primary underline"
                  >
                    {settings.lastRead.lines} line mushaf · page {settings.lastRead.page}
                  </button>
                </div>
              )}

              {settings.history.length > 0 && (
                <div className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 font-medium">
                    <Clock className="size-4 text-primary" /> Reading history
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {settings.history.slice(0, 8).map((h) => (
                      <li key={h.href + h.at}>{h.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {settings.tajweedColors && (
                <div className="rounded-xl border border-border p-3 text-xs">
                  <p className="font-medium">Tajweed legend</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TAJWEED_COLORS.map((t) => (
                      <span key={t.key} style={{ color: t.color }}>
                        ● {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        onClick={() => set(!on)}
        aria-pressed={on}
        className={`h-6 w-11 shrink-0 rounded-full transition ${on ? "gradient-hero" : "bg-secondary"}`}
      >
        <span className={`block size-4 rounded-full bg-card transition ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
