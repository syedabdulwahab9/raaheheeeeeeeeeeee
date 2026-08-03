import { useNavigate } from "@tanstack/react-router";
import { Mic, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { searchSite } from "@/lib/search-index";


type SpeechRecognitionLike = {
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

export function SearchBar({
  placeholder = "Search Quran, hadith, duas…",
  initialQuery = "",
  onSearch,
}: {
  placeholder?: string;
  initialQuery?: string;
  onSearch?: (value: string) => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const navigate = useNavigate();

  /** Live suggestions across every indexed item of the whole site. */
  const suggestions = useMemo(() => (focused ? searchSite(q, 8) : []), [q, focused]);

  const submit = (value: string) => {
    const term = value.trim();
    if (!term) return;
    if (onSearch) {
      onSearch(term);
      return;
    }
    void navigate({ to: "/search", search: { q: term } });
  };

  const startMic = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      setQ(text);
      submit(text);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-soft focus-within:shadow-glow"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Search by voice"
          onClick={startMic}
          className={`relative rounded-full p-2 transition ${listening ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
        >
          {listening && <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" aria-hidden />}
          <Mic className="relative size-4" />
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-glow">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFocused(false);
                  void navigate({ to: s.to, ...(s.params ? { params: s.params } : {}) } as never);
                }}
                className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-secondary/70"
              >
                <span className="block text-sm font-medium">{s.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.section} · {s.subtitle.slice(0, 90)}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setFocused(false);
                submit(q);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-secondary/70"
            >
              See all results for “{q.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
