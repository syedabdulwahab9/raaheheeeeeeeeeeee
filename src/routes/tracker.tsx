import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Flame, Upload } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "Salah Tracker — Full Year Prayer Log with Backup | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Track all five daily prayers for the whole year, see monthly and yearly progress, keep your streak, and export or restore a backup of your log.",
      },
      { property: "og:title", content: "Salah Tracker — Full Year | Raah e Hidayath" },
      { property: "og:description", content: "A full year of salah tracking with backup and restore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tracker,
});

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const KEY = "reh-salah-tracker";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Tracker() {
  const today = new Date();
  const todayIso = iso(today);
  const [log, setLog] = useState<Record<string, string[]>>({});
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(todayIso);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLog(JSON.parse(raw) as Record<string, string[]>);
    } catch {
      /* ignore */
    }
  }, []);

  const save = (next: Record<string, string[]>) => {
    setLog(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = (day: string, prayer: string) => {
    if (day > todayIso) return;
    const current = log[day] ?? [];
    const next = current.includes(prayer) ? current.filter((p) => p !== prayer) : [...current, prayer];
    save({ ...log, [day]: next });
  };

  /* ---- Month grid ---- */
  const monthDays = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const count = new Date(view.y, view.m + 1, 0).getDate();
    return {
      leading: (first.getDay() + 6) % 7 /* Monday-first */,
      days: Array.from({ length: count }, (_, i) => iso(new Date(view.y, view.m, i + 1))),
    };
  }, [view]);

  const shiftMonth = (dir: -1 | 1) => {
    setView((v) => {
      const d = new Date(v.y, v.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  /* ---- Stats ---- */
  const yearPrefix = `${view.y}-`;
  const yearEntries = Object.entries(log).filter(([d]) => d.startsWith(yearPrefix));
  const yearDone = yearEntries.reduce((s, [, p]) => s + p.length, 0);
  const daysPassed = yearEntries.length || 1;

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    if ((log[iso(d)]?.length ?? 0) < 5) d.setDate(d.getDate() - 1) /* today may still be in progress */;
    while ((log[iso(d)]?.length ?? 0) === 5) {
      s += 1;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [log]);

  /* ---- Backup ---- */
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: "raah-e-hidayath", kind: "salah-tracker", log }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `salah-tracker-backup-${todayIso}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Backup downloaded. Keep it safe — you can restore it on any device.");
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { log?: Record<string, string[]> } | Record<string, string[]>;
      const incoming = "log" in parsed && parsed.log ? parsed.log : (parsed as Record<string, string[]>);
      const clean: Record<string, string[]> = {};
      for (const [day, prayers] of Object.entries(incoming)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(prayers)) {
          clean[day] = prayers.filter((p): p is string => typeof p === "string" && (PRAYERS as readonly string[]).includes(p));
        }
      }
      if (!Object.keys(clean).length) throw new Error("empty");
      save({ ...log, ...clean });
      setStatus(`Backup restored — ${Object.keys(clean).length} days of prayers imported.`);
    } catch {
      setStatus("That file does not look like a salah tracker backup.");
    }
  };

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedDone = log[selected]?.length ?? 0;

  return (
    <div className="space-y-6">
      <SectionTitle title="Salah Tracker" subtitle="Your whole year of prayers — saved on this device, with backup" />

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="font-display text-2xl">{yearDone}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Prayers in {view.y}</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-2xl">{Math.round((yearDone / (daysPassed * 5)) * 100) || 0}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Of tracked days</p>
        </Card>
        <Card className="text-center">
          <p className="flex items-center justify-center gap-1 font-display text-2xl">
            <Flame className="size-5 text-accent" aria-hidden /> {streak}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Perfect-day streak</p>
        </Card>
      </div>

      {/* ---- Month browser ---- */}
      <Card>
        <div className="flex items-center justify-between">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <h2 className="font-display text-lg">{monthName}</h2>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border hover:text-primary"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: monthDays.leading }).map((_, i) => (
            <span key={`x${i}`} />
          ))}
          {monthDays.days.map((day) => {
            const done = log[day]?.length ?? 0;
            const future = day > todayIso;
            const isSelected = day === selected;
            return (
              <button
                key={day}
                disabled={future}
                onClick={() => setSelected(day)}
                aria-label={`${day}: ${done} of 5 prayers`}
                aria-pressed={isSelected}
                className={`flex min-h-10 flex-col items-center justify-center rounded-xl border text-xs transition ${
                  isSelected
                    ? "border-transparent gradient-hero text-primary-foreground"
                    : future
                      ? "border-border/40 text-muted-foreground/40"
                      : done === 5
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : done > 0
                          ? "border-border bg-accent/10"
                          : "border-border hover:text-primary"
                }`}
              >
                <span>{Number(day.slice(-2))}</span>
                {!future && done > 0 && !isSelected && (
                  <span className="text-[9px] font-semibold text-primary">{done}/5</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---- Selected day ---- */}
      <Card>
        <p className="text-sm font-semibold">
          {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{selectedDone}/5 complete</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRAYERS.map((p) => {
            const done = log[selected]?.includes(p);
            const future = selected > todayIso;
            return (
              <button
                key={p}
                disabled={future}
                onClick={() => toggle(selected, p)}
                aria-pressed={done}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition ${
                  done
                    ? "border-transparent gradient-hero text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-primary disabled:opacity-40"
                }`}
              >
                {done && <Check className="size-3.5" aria-hidden />}
                {p}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---- Backup ---- */}
      <Card className="space-y-3">
        <h2 className="font-display text-lg">Backup &amp; restore</h2>
        <p className="text-sm text-muted-foreground">
          Your log is stored privately on this device. Download a backup to keep it forever, and restore it here or on
          any other phone or browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportBackup}
            className="inline-flex min-h-11 items-center gap-2 rounded-full gradient-hero px-5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="size-4" aria-hidden /> Download backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:text-primary"
          >
            <Upload className="size-4" aria-hidden /> Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void importBackup(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p aria-live="polite" className={`text-sm text-primary ${status ? "" : "sr-only"}`}>
          {status}
        </p>
      </Card>
    </div>
  );
}
