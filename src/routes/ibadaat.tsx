import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, SectionTitle } from "@/components/AppShell";
import { IBADAAT_SECTIONS, IBADAAT_URDU, LANGUAGES, SHAHADAH, TAJWEED_RULES } from "@/lib/islamic-data";
import { useCustomContentSnapshot } from "@/lib/content-store";
import { useSettings } from "@/lib/settings";
import { useTranslate } from "@/lib/translate";

export const Route = createFileRoute("/ibadaat")({
  head: () => ({
    meta: [
      { title: "Ibadaat — Salah, Fasting, Hajj, Umrah & Janazah | Raah e Hidayath" },
      { name: "description", content: "Detailed guidance on prayer, wudu, fasting, Zakat, Hajj, Umrah, Namaz-e-Janazah, the Shahadah and the rules of tajweed and stopping — available in every language." },
      { property: "og:title", content: "Ibadaat — Complete Worship Guide | Raah e Hidayath" },
      { property: "og:description", content: "Every act of worship explained step by step, in your language." },
    ],
  }),
  component: Ibadaat,
});

function Ibadaat() {
  const [open, setOpen] = useState<string | null>("salah");
  const [urdu, setUrdu] = useState<Record<string, boolean>>({});
  const customIbadaat = useCustomContentSnapshot().ibadaat;
  const { settings } = useSettings();

  /* Language here is local to this section only — changing it never touches the
     rest of the site (home, Quran, navigation all stay as they are). */
  const [lang, setLang] = useState<string>(settings.lang);
  const [fading, setFading] = useState(false);
  const rtl = LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;

  const changeLang = (next: string) => {
    setFading(true);
    setLang(next);
    window.requestAnimationFrame(() => setFading(false));
  };


  const { tr, ready } = useTranslate(
    [
      "Ibadaat",
      "Salah · Sawm · Zakat · Hajj · Umrah · Janazah · Tajweed",
      "Shahadah",
      "Language",
      "Translating this section into your language…",
      "Added by the admin",
      "Tajweed — Pronunciation & Rules of Stopping",
      SHAHADAH.english,
      ...IBADAAT_SECTIONS.map((s) => s.title),
      ...IBADAAT_SECTIONS.map((s) => s.summary),
      ...IBADAAT_SECTIONS.flatMap((s) => s.items.map((i) => i.h)),
      ...IBADAAT_SECTIONS.flatMap((s) => s.items.map((i) => i.b)),
      ...TAJWEED_RULES.map((t) => t.title),
      ...TAJWEED_RULES.flatMap((t) => t.rules),
    ],
    lang,
  );

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={`space-y-6 transition-opacity duration-100 ease-out ${fading ? "opacity-70" : "opacity-100"}`}
    >
      <SectionTitle title={tr("Ibadaat")} subtitle={tr("Salah · Sawm · Zakat · Hajj · Umrah · Janazah · Tajweed")} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft">
          <span className="text-xs text-muted-foreground">{tr("Language")}</span>
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </label>
        {!ready && lang !== "en" && (
          <span className="text-xs text-muted-foreground">{tr("Translating this section into your language…")}</span>
        )}
      </div>



      <Card className="gradient-hero text-primary-foreground">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">{tr("Shahadah")}</p>
        <p className="arabic-ayah mt-3 text-2xl text-accent">{SHAHADAH.arabic}</p>
        <p className="mt-3 text-sm italic text-primary-foreground/80">{SHAHADAH.transliteration}</p>
        <p className="mt-2 text-sm">{tr(SHAHADAH.english)}</p>
        <p className="urdu-text mt-2 text-sm text-primary-foreground/90">{SHAHADAH.urdu}</p>
      </Card>

      <div className="space-y-3">
        {IBADAAT_SECTIONS.map((s) => {
          const isOpen = open === s.id;
          return (
            <Card key={s.id} className="animate-rise">
              <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center justify-between text-left">
                <span>
                  <span className="block font-display text-lg">{tr(s.title)}</span>
                  <span className="block text-xs text-muted-foreground">{tr(s.summary)}</span>
                </span>
                <span className={`text-primary transition ${isOpen ? "rotate-90" : ""}`}>▸</span>
              </button>
              {isOpen && (
                <div className="mt-4 space-y-3">
                  {IBADAAT_URDU[s.id] && (
                    <div className="flex justify-end">
                      <div className="flex overflow-hidden rounded-full border border-border text-[11px] font-medium" role="group" aria-label="Section language">
                        <button
                          onClick={() => setUrdu((p) => ({ ...p, [s.id]: false }))}
                          aria-pressed={!urdu[s.id]}
                          className={`px-3 py-1 transition ${!urdu[s.id] ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => setUrdu((p) => ({ ...p, [s.id]: true }))}
                          aria-pressed={urdu[s.id]}
                          className={`urdu-text px-3 py-1 transition ${urdu[s.id] ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          اردو
                        </button>
                      </div>
                    </div>
                  )}
                  {urdu[s.id] && IBADAAT_URDU[s.id] ? (
                    <div dir="rtl" className="rounded-xl bg-secondary/60 p-4">
                      <p className="urdu-text text-right text-sm leading-loose">{IBADAAT_URDU[s.id]}</p>
                    </div>
                  ) : (
                    s.items.map((it) => (
                      <div key={it.h} className="rounded-xl bg-secondary/60 p-4">
                        <p className="font-semibold text-primary">{tr(it.h)}</p>
                        <p className="mt-1 text-sm leading-relaxed">{tr(it.b)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {customIbadaat.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl">{tr("Added by the admin")}</h2>
          {customIbadaat.map((s) => {
            const isOpen = open === s.id;
            const showUr = Boolean(urdu[s.id] && s.urdu);
            return (
              <Card key={s.id} className="animate-rise">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center justify-between text-left">
                  <span>
                    <span className="block font-display text-lg">{s.title}</span>
                    {s.summary && <span className="block text-xs text-muted-foreground">{s.summary}</span>}
                  </span>
                  <span className={`text-primary transition ${isOpen ? "rotate-90" : ""}`}>▸</span>
                </button>
                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {s.urdu && (
                      <div className="flex justify-end">
                        <div className="flex overflow-hidden rounded-full border border-border text-[11px] font-medium" role="group" aria-label="Section language">
                          <button onClick={() => setUrdu((p) => ({ ...p, [s.id]: false }))} aria-pressed={!urdu[s.id]} className={`px-3 py-1 transition ${!urdu[s.id] ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
                          <button onClick={() => setUrdu((p) => ({ ...p, [s.id]: true }))} aria-pressed={urdu[s.id]} className={`urdu-text px-3 py-1 transition ${urdu[s.id] ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>اردو</button>
                        </div>
                      </div>
                    )}
                    <div dir={showUr ? "rtl" : "ltr"} className="rounded-xl bg-secondary/60 p-4">
                      <p className={`text-sm leading-relaxed ${showUr ? "urdu-text text-right leading-loose" : ""}`}>
                        {showUr ? s.urdu : s.body}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-xl">{tr("Tajweed — Pronunciation & Rules of Stopping")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TAJWEED_RULES.map((t) => (
            <Card key={t.title}>
              <p className="font-semibold text-primary">{tr(t.title)}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {t.rules.map((r) => (
                  <li key={r}>• {tr(r)}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}