import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Islamic AI Assistant | Raah e Hidayath" },
      { name: "description", content: "Ask any question about the Quran, hadith, fiqh, worship and Islamic history and get an answer grounded in authentic sources." },
      { property: "og:title", content: "Islamic AI Assistant | Raah e Hidayath" },
      { property: "og:description", content: "Answers grounded in Quran and authentic Sunnah, in your language." },
    ],
  }),
  component: AiPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I perform Salatul Janazah?",
  "What are the conditions of a valid wudu?",
  "Explain the virtues of Surah Al-Kahf",
  "How is Zakat calculated on gold?",
];

function AiPage() {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", language: settings.lang, messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: "Sorry — the assistant is unavailable right now. Please try again." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Islamic AI Assistant" subtitle="Answers grounded in the Quran and authentic Sunnah — always verify with a qualified scholar" />

      <div ref={boxRef} className="max-h-[55vh] space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/60 p-4">
        {messages.length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <p className="arabic-ayah text-2xl text-primary">رَبِّ زِدْنِي عِلْمًا</p>
            <p className="text-sm text-muted-foreground">Ask anything about Islam.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => void send(s)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <p className="max-w-[85%] rounded-2xl gradient-hero px-4 py-2.5 text-sm text-primary-foreground">{m.content}</p>
            ) : (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {m.content || <span className="text-muted-foreground">Thinking…</span>}
              </p>
            )}
          </div>
        ))}
      </div>

      <Card className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask your question…"
          className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none"
        />
        <button
          onClick={() => void send(input)}
          disabled={busy}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-xl gradient-hero text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </Card>
    </div>
  );
}