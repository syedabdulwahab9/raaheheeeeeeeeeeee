import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookText, ChevronLeft, ChevronRight, Languages, Pause, Play, ScrollText, Sparkles, Volume2 } from "lucide-react";
import { Card } from "@/components/AppShell";
import { useSettings } from "@/lib/settings";
import { ayahAudioUrl, fetchSurah, fetchSurahList, fetchTafsir, type Ayah } from "@/lib/quran-api";
import { getLanguage, LANGUAGES, RECITERS, VOICE_PROFILES } from "@/lib/islamic-data";
import { speak, stopSpeaking, ttsSupported } from "@/lib/tts";
import { setActiveAudio, stopAllAudio } from "@/lib/audio-bus";

export const Route = createFileRoute("/quran/$surahId")({
  head: ({ params }) => ({
    meta: [
      { title: `Surah ${params.surahId} — Read, Listen & Tafseer | Raah e Hidayath` },
      { name: "description", content: "Arabic text, recitation, translation, tafseer and full explanation of every ayah in your language, each with its own audio." },
      { property: "og:title", content: `Surah ${params.surahId} | Raah e Hidayath` },
      { property: "og:description", content: "Read, listen and understand every ayah." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SurahPage,
});

type Mode = "read" | "audio" | "translation" | "tafseer" | "explain";

const MODES: Array<{ id: Mode; label: string; icon: typeof BookText }> = [
  { id: "read", label: "Read only", icon: BookText },
  { id: "audio", label: "Recitation", icon: Play },
  { id: "translation", label: "Translation", icon: Languages },
  { id: "tafseer", label: "Tafseer", icon: ScrollText },
  { id: "explain", label: "Explanation", icon: Sparkles },
];

async function fetchExplanation(surah: number, ayah: Ayah, langCode: string) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "ayah-explanation",
      language: langCode,
      prompt: `Surah ${surah}, Ayah ${ayah.numberInSurah}.\nArabic: ${ayah.arabic}\nTranslation: ${ayah.translation}`,
    }),
  });
  if (!res.ok || !res.body) throw new Error("failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
  }
  return acc;
}

function SurahPage() {
  const { surahId } = Route.useParams();
  const num = Number(surahId);
  const { settings, update } = useSettings();
  const lang = getLanguage(settings.lang);
  const [mode, setMode] = useState<Mode>("read");
  const [playing, setPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["surah", num, settings.lang, settings.translationEdition],
    queryFn: () => fetchSurah(num, settings.lang, settings.translationEdition),
    staleTime: 1000 * 60 * 60,
  });
  const { data: surahs } = useQuery({ queryKey: ["surahs"], queryFn: fetchSurahList, staleTime: Infinity });
  const meta = surahs?.find((s) => s.number === num);

  const ayahs = useMemo(() => data?.ayahs ?? [], [data]);

  const stop = useCallback(() => {
    audioRef.current = null;
    stopAllAudio();
    setPlaying(null);
  }, []);

  useEffect(() => stop, [stop]);

  /* Any change of mode, reciter, language or surah must silence whatever is
     currently playing so the next play uses exactly the new selection. */
  useEffect(() => {
    stop();
  }, [mode, settings.reciter, settings.lang, num, stop]);

  const playFrom = useCallback(
    async (index: number) => {
      const ayah = ayahs[index];
      if (!ayah) {
        stop();
        return;
      }
      if (mode === "read") return; /* Read mode is pure text — never any audio. */
      audioRef.current?.pause();
      audioRef.current = null;
      stopSpeaking();
      setPlaying(index);
      document.getElementById(`ayah-${ayah.numberInSurah}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

      const next = () => void playFrom(index + 1);
      const voice = { voiceProfile: settings.voiceProfile, speed: settings.playbackSpeed };

      if (mode === "audio") {
        const audio = new Audio(ayahAudioUrl(ayah.number, settings.reciter, settings.audioQuality));
        audio.playbackRate = settings.playbackSpeed;
        audioRef.current = audio;
        setActiveAudio(audio);
        let played = 0;
        audio.onended = () => {
          played += 1;
          if (played < settings.repeatVerses) {
            audio.currentTime = 0;
            void audio.play();
          } else next();
        };
        void audio.play();
        return;
      }

      if (mode === "translation") {
        speak(ayah.translation, lang.speech, { ...voice, onEnd: next });
        return;
      }

      if (mode === "tafseer") {
        try {
          const text = await fetchTafsir(num, ayah.numberInSurah, settings.lang, settings.tafsirSlug);
          speak(text, lang.speech, { ...voice, onEnd: next });
        } catch {
          next();
        }
        return;
      }

      try {
        const text = await fetchExplanation(num, ayah, settings.lang);
        speak(text, lang.speech, { ...voice, onEnd: next });
      } catch {
        next();
      }
    },
    [
      ayahs, mode, num, lang.speech, stop,
      settings.lang, settings.reciter, settings.audioQuality, settings.playbackSpeed,
      settings.repeatVerses, settings.voiceProfile, settings.tafsirSlug,
    ],
  );

  const playLabel =
    mode === "translation" ? "Play translation" : mode === "tafseer" ? "Play tafseer" : mode === "explain" ? "Play explanation" : "Play recitation";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/quran" className="inline-flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4 shrink-0" /> All Surahs
        </Link>
        <div className="flex shrink-0 gap-2 text-sm">
          {num > 1 && (
            <Link to="/quran/$surahId" params={{ surahId: String(num - 1) }} className="rounded-full border border-border px-3 py-1 hover:text-primary">
              <ChevronLeft className="inline size-3" /> Prev
            </Link>
          )}
          {num < 114 && (
            <Link to="/quran/$surahId" params={{ surahId: String(num + 1) }} className="rounded-full border border-border px-3 py-1 hover:text-primary">
              Next <ChevronRight className="inline size-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl gradient-hero p-5 text-primary-foreground shadow-glow sm:p-6">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-accent/20 blur-2xl animate-float" aria-hidden />
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Surah {num}</p>
        <h1 className="mt-2 break-words font-display text-2xl sm:text-3xl">{meta?.englishName ?? "…"}</h1>
        <p className="text-sm text-primary-foreground/80">
          {meta?.englishNameTranslation} · {meta?.numberOfAyahs} ayahs · {meta?.revelationType}
        </p>
        <p className="arabic-ayah mt-3 break-words text-2xl text-accent sm:text-3xl">{meta?.name}</p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              mode === id
                ? "border-transparent gradient-hero text-primary-foreground shadow-soft"
                : "border-border bg-card text-muted-foreground hover:text-primary"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {mode === "read" ? (
        <Card className="text-sm text-muted-foreground">
          Read only — just the ayats of this surah. Switch to Recitation, Translation, Tafseer or Explanation
          above whenever you want to listen.
        </Card>
      ) : (
      <Card className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Language</span>
            <select
              value={settings.lang}
              onChange={(e) => update({ lang: e.target.value as typeof settings.lang })}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} — {l.native}
                </option>
              ))}
            </select>
          </label>
          {mode === "audio" ? (
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Reciter</span>
            <select
              value={settings.reciter}
              onChange={(e) => update({ reciter: e.target.value })}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.style}
                </option>
              ))}
            </select>
          </label>
          ) : (
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Narration voice</span>
            <select
              value={settings.voiceProfile}
              onChange={(e) => update({ voiceProfile: e.target.value })}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5"
            >
              {VOICE_PROFILES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          )}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Playback speed — {settings.playbackSpeed.toFixed(2)}×</span>
          <input
            type="range" min={0.5} max={2} step={0.05}
            value={settings.playbackSpeed}
            onChange={(e) => update({ playbackSpeed: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
        <button
          onClick={() => (playing === null ? void playFrom(0) : stop())}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 font-semibold text-accent-foreground sm:w-auto"
        >
          {playing === null ? <Play className="size-4" /> : <Pause className="size-4" />}
          {playing === null ? `${playLabel} — whole surah` : "Stop"}
        </button>
        {mode !== "audio" && !ttsSupported() && (
          <p className="text-xs text-muted-foreground">Voice playback is not supported in this browser.</p>
        )}
      </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-border bg-card shimmer" />
          ))}
        </div>
      )}
      {error && <Card className="text-sm text-destructive">Couldn't load this surah. Please retry.</Card>}

      <div className="space-y-4">
        {ayahs.map((ayah, i) => (
          <AyahCard
            key={ayah.number}
            ayah={ayah}
            surah={num}
            mode={mode}
            langCode={settings.lang}
            speechTag={lang.speech}
            rtlTranslation={!!lang.rtl}
            urdu={settings.lang === "ur"}
            arabicSize={settings.arabicSize}
            transliteration={settings.showTransliteration}
            voiceProfile={settings.voiceProfile}
            speed={settings.playbackSpeed}
            tafsirSlug={settings.tafsirSlug}
            isPlaying={playing === i}
            onPlay={() => (playing === i ? stop() : void playFrom(i))}
          />
        ))}
      </div>
    </div>
  );
}

function AyahCard(props: {
  ayah: Ayah;
  surah: number;
  mode: Mode;
  langCode: string;
  speechTag: string;
  rtlTranslation: boolean;
  urdu: boolean;
  arabicSize: number;
  transliteration: boolean;
  voiceProfile: string;
  speed: number;
  tafsirSlug: string;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const {
    ayah, mode, surah, langCode, speechTag, rtlTranslation, urdu, arabicSize, transliteration,
    voiceProfile, speed, tafsirSlug, isPlaying, onPlay,
  } = props;
  const [openTafsir, setOpenTafsir] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const voice = { voiceProfile, speed };

  const tafsirQuery = useQuery({
    queryKey: ["tafsir", surah, ayah.numberInSurah, langCode, tafsirSlug],
    queryFn: () => fetchTafsir(surah, ayah.numberInSurah, langCode, tafsirSlug),
    enabled: openTafsir,
    staleTime: Infinity,
  });

  const explain = async () => {
    setExplaining(true);
    setExplanation("");
    try {
      const text = await fetchExplanation(surah, ayah, langCode);
      setExplanation(text);
    } catch {
      setExplanation("Explanation is temporarily unavailable. Please try again.");
    } finally {
      setExplaining(false);
    }
  };

  const playLabel =
    mode === "translation" ? "Listen to translation" : mode === "tafseer" ? "Listen to tafseer" : mode === "explain" ? "Listen to explanation" : "Play recitation";

  return (
    <Card id={`ayah-${ayah.numberInSurah}`} className={`overflow-hidden ${isPlaying ? "ring-2 ring-primary/50" : ""}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {surah}:{ayah.numberInSurah}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-2 text-xs text-muted-foreground">
          <span className="truncate">Juz {ayah.juz} · Page {ayah.page}</span>
          {mode !== "read" && (
          <button
            onClick={onPlay}
            aria-label={playLabel}
            title={playLabel}
            className="shrink-0 rounded-full border border-border p-1.5 text-primary transition hover:bg-primary/10"
          >
            {isPlaying ? <Pause className="size-3.5" /> : mode === "audio" ? <Play className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>
          )}
        </div>
      </div>

      <p className="arabic-ayah mt-4 break-words text-right" style={{ fontSize: `${arabicSize}px`, lineHeight: 2 }}>
        {ayah.arabic}
      </p>

      {mode !== "read" && transliteration && ayah.transliteration && (
        <p className="mt-3 break-words text-sm italic text-muted-foreground">{ayah.transliteration}</p>
      )}

      {mode !== "read" && (
        <p className={`mt-3 break-words text-[15px] leading-relaxed ${urdu ? "urdu-text text-right" : rtlTranslation ? "text-right" : ""}`}>
          {ayah.translation}
        </p>
      )}

      {mode === "translation" && (
        <button
          onClick={() => speak(ayah.translation, speechTag, voice)}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Volume2 className="size-3.5" /> Play translation audio
        </button>
      )}

      {mode === "tafseer" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpenTafsir((v) => !v)} className="text-sm font-semibold text-primary hover:underline">
              {openTafsir ? "Hide tafseer" : "Show tafseer of this ayah"}
            </button>
            {tafsirQuery.data && (
              <button
                onClick={() => speak(tafsirQuery.data, speechTag, voice)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
              >
                <Volume2 className="size-3.5" /> Play tafseer audio
              </button>
            )}
          </div>
          {openTafsir && (
            <div className="mt-3 rounded-xl bg-secondary/60 p-4 text-sm leading-relaxed">
              {tafsirQuery.isLoading && <span className="text-muted-foreground">Loading tafseer…</span>}
              {tafsirQuery.error && <span className="text-destructive">Tafseer unavailable for this ayah.</span>}
              {tafsirQuery.data && (
                <div
                  className={`break-words ${urdu ? "urdu-text text-right" : rtlTranslation ? "text-right" : ""}`}
                  dangerouslySetInnerHTML={{ __html: tafsirQuery.data }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {mode === "explain" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={explain}
              disabled={explaining}
              className="rounded-full gradient-hero px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {explaining ? "Explaining…" : explanation ? "Explain again" : "Full explanation of this ayah"}
            </button>
            {explanation && (
              <button
                onClick={() => speak(explanation, speechTag, voice)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-primary"
              >
                <Volume2 className="size-3.5" /> Play explanation audio
              </button>
            )}
          </div>
          {explanation && (
            <div className={`whitespace-pre-wrap break-words rounded-xl bg-secondary/60 p-4 text-sm leading-relaxed ${urdu ? "urdu-text text-right" : ""}`}>
              {explanation}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
