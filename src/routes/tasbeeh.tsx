import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { TASBEEH_PRESETS } from "@/lib/islamic-data";

export const Route = createFileRoute("/tasbeeh")({
  head: () => ({
    meta: [
      { title: "Digital Tasbeeh Counter | Raah e Hidayath" },
      { name: "description", content: "Count SubhanAllah, Alhamdulillah, Allahu Akbar, Durood and Istighfar with a beautiful digital tasbeeh." },
      { property: "og:title", content: "Digital Tasbeeh | Raah e Hidayath" },
      { property: "og:description", content: "Keep your daily dhikr on track." },
    ],
  }),
  component: Tasbeeh,
});

function Tasbeeh() {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const preset = TASBEEH_PRESETS[index]!;
  const pct = Math.min(100, (count / preset.target) * 100);

  return (
    <div className="space-y-6">
      <SectionTitle title="Digital Tasbeeh" subtitle="Tap the circle for every dhikr" />
      <div className="flex flex-wrap gap-2">
        {TASBEEH_PRESETS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => {
              setIndex(i);
              setCount(0);
            }}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              i === index ? "border-transparent gradient-hero text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-primary"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-6 py-10">
        <p className="arabic-ayah text-4xl text-primary">{preset.arabic}</p>
        <button onClick={() => setCount((c) => c + 1)} className="relative grid size-52 place-items-center rounded-full gradient-hero text-primary-foreground shadow-glow active:scale-95">
          <span className="absolute inset-0 rounded-full bg-primary/25 animate-pulse-ring" aria-hidden />
          <span className="relative font-display text-6xl">{count}</span>
        </button>
        <div className="w-full max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full gradient-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Target {preset.target} · {count >= preset.target ? "Completed, MashaAllah" : `${preset.target - count} remaining`}
          </p>
        </div>
        <button onClick={() => setCount(0)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-primary">
          <RotateCcw className="size-4" /> Reset
        </button>
      </Card>
    </div>
  );
}