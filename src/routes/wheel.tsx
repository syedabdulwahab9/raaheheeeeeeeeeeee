import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Languages, Sparkles } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";

export const Route = createFileRoute("/wheel")({
  head: () => ({
    meta: [
      { title: "Good Deed Wheel — Spin for Today's Good Deed | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Spin the wheel and receive a good deed for today — a beautiful Islamic game that turns kindness into daily habits.",
      },
      { property: "og:title", content: "Good Deed Wheel | Raah e Hidayath" },
      { property: "og:description", content: "Spin, receive a good deed, and complete it today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Wheel,
});

const DEEDS = [
  { en: "Pray every salah on time today", ur: "آج ہر نماز وقت پر ادا کریں", short: "Pray on time", shortUr: "نماز باوقت" },
  { en: "Give sadaqah — even a little", ur: "صدقہ کریں — تھوڑا ہی کیوں نہ ہو", short: "Give sadaqah", shortUr: "صدقہ کریں" },
  { en: "Say SubhanAllah 33 times", ur: "۳۳ بار سبحان اللہ کہیں", short: "SubhanAllah ×33", shortUr: "سبحان اللہ ۳۳" },
  { en: "Read one page of the Qur'an", ur: "قرآن کا ایک صفحہ پڑھیں", short: "Read Qur'an", shortUr: "قرآن پڑھیں" },
  { en: "Smile at someone — it is charity", ur: "کسی پر مسکرائیں — یہ بھی صدقہ ہے", short: "Smile", shortUr: "مسکرائیں" },
  { en: "Call your parents today", ur: "آج والدین کو فون کریں", short: "Call parents", shortUr: "والدین کو فون" },
  { en: "Say Astaghfirullah 100 times", ur: "۱۰۰ بار استغفر اللہ کہیں", short: "Istighfar ×100", shortUr: "استغفار ۱۰۰" },
  { en: "Feed a bird or an animal", ur: "کسی پرندے یا جانور کو کھانا دیں", short: "Feed a bird", shortUr: "پرندے کو دانہ" },
  { en: "Help a neighbour with something", ur: "کسی پڑوسی کی مدد کریں", short: "Help neighbour", shortUr: "پڑوسی کی مدد" },
  { en: "Send salawat on the Prophet ﷺ 10 times", ur: "۱۰ بار درود شریف پڑھیں", short: "Salawat ×10", shortUr: "درود ۱۰ بار" },
  { en: "Forgive someone today", ur: "آج کسی کو معاف کر دیں", short: "Forgive", shortUr: "معاف کریں" },
  { en: "Remove something harmful from a path", ur: "راستے سے کوئی تکلیف دہ چیز ہٹائیں", short: "Clear a path", shortUr: "راستہ صاف کریں" },
  { en: "Check on someone who is sick", ur: "کسی بیمار کی خیریت پوچھیں", short: "Visit the sick", shortUr: "بیمار کی عیادت" },
  { en: "Make dua for someone in their absence", ur: "کسی کی غیر موجودگی میں اس کے لیے دعا کریں", short: "Dua for others", shortUr: "غیبانہ دعا" },
];

const KEY = "reh-wheel-deeds";
const todayIso = () => new Date().toISOString().slice(0, 10);

function Wheel() {
  const [lang, setLang] = useState<"en" | "ur">("en");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [done, setDone] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { date?: string; items?: string[] };
      return raw.date === todayIso() ? (raw.items ?? []) : [];
    } catch {
      return [];
    }
  });
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const segAngle = 360 / DEEDS.length;
  const urdu = lang === "ur";

  const gradient = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < DEEDS.length; i++) {
      const a = i * segAngle;
      const b = (i + 1) * segAngle;
      parts.push(
        i % 2 === 0
          ? `var(--primary) ${a}deg ${b}deg`
          : `color-mix(in oklab, var(--primary) 55%, var(--card)) ${a}deg ${b}deg`,
      );
    }
    return `conic-gradient(from -90deg, ${parts.join(", ")})`;
  }, [segAngle]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const index = Math.floor(Math.random() * DEEDS.length);
    const target = 360 - (index * segAngle + segAngle / 2); /* pointer sits at the top */
    const turns = 5 + Math.floor(Math.random() * 3);
    const next = rotation + turns * 360 + (((target - rotation) % 360) + 360) % 360;
    setRotation(next);
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(index);
    }, 4800);
  };

  const markDone = () => {
    if (result === null) return;
    const label = DEEDS[result]!.en;
    const next = done.includes(label) ? done : [...done, label];
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify({ date: todayIso(), items: next }));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title={urdu ? "نیکیوں کا پہیہ" : "Good Deed Wheel"}
        subtitle={urdu ? "پہیہ گھمائیں اور آج کی نیکی حاصل کریں" : "Spin the wheel and receive your good deed for today"}
      />

      <div className="flex justify-center">
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-muted-foreground" aria-hidden />
          {(["en", "ur"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`min-h-11 rounded-full border px-5 text-sm font-semibold transition ${
                lang === l ? "border-transparent gradient-hero text-primary-foreground" : "border-border hover:text-primary"
              }`}
            >
              {l === "en" ? "English" : "اردو"}
            </button>
          ))}
        </div>
      </div>

      {/* Wheel */}
      <div className="relative mx-auto w-full max-w-sm">
        <div
          aria-hidden
          className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-2"
          style={{ borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "22px solid var(--accent)", width: 0, height: 0 }}
        />
        <div
          className="relative aspect-square rounded-full border-8 border-accent/70 shadow-glow"
          style={{
            background: gradient,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.8s cubic-bezier(0.12, 0.8, 0.16, 1)" : "none",
          }}
        >
          {DEEDS.map((d, i) => {
            /* Labels stay horizontal around the rim — clean and readable,
             * never congested. The full deed shows in the result card. */
            const angle = ((i * segAngle + segAngle / 2 - 90) * Math.PI) / 180;
            const left = 50 + 33 * Math.cos(angle);
            const top = 50 + 33 * Math.sin(angle);
            return (
              <span
                key={i}
                aria-hidden
                className={`absolute w-14 -translate-x-1/2 -translate-y-1/2 text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-primary-foreground drop-shadow-sm sm:w-16 sm:text-[9px] ${urdu ? "urdu-text normal-case tracking-normal" : ""}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {urdu ? d.shortUr : d.short}
              </span>
            );
          })}
        </div>
        <button
          onClick={spin}
          disabled={spinning}
          className="absolute left-1/2 top-1/2 z-10 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full gradient-gold font-display text-lg text-primary shadow-glow transition hover:scale-105 disabled:opacity-70"
        >
          {spinning ? <Sparkles className="size-8 animate-spin-slow" aria-hidden /> : urdu ? "گھمائیں" : "SPIN"}
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <Card className="animate-rise space-y-3 border-accent/60 py-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">{urdu ? "آج کی نیکی" : "Your deed for today"}</p>
          <p className={`font-display text-2xl leading-relaxed ${urdu ? "urdu-text" : ""}`}>
            {urdu ? DEEDS[result]!.ur : DEEDS[result]!.en}
          </p>
          <button
            onClick={markDone}
            disabled={done.includes(DEEDS[result]!.en)}
            className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full gradient-hero px-6 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Check className="size-4" aria-hidden />
            {done.includes(DEEDS[result]!.en)
              ? urdu
                ? "الحمدللہ، مکمل!"
                : "Alhamdulillah, done!"
              : urdu
                ? "مکمل کر لیا"
                : "I completed it"}
          </button>
        </Card>
      )}

      {/* Today's completed deeds */}
      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">{urdu ? "آج کی مکمل نیکیاں" : "Completed today"}</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{done.length}</span>
        </div>
        {done.length ? (
          <ul className="mt-3 space-y-2">
            {done.map((d) => (
              <li key={d} className="flex items-center gap-2 text-sm">
                <span className="grid size-5 place-items-center rounded-full gradient-hero">
                  <Check className="size-3 text-primary-foreground" aria-hidden />
                </span>
                {d}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {urdu ? "پہیہ گھمائیں اور اپنی پہلی نیکی مکمل کریں۔" : "Spin the wheel and complete your first deed."}
          </p>
        )}
      </Card>
    </div>
  );
}
