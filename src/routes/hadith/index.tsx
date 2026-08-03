import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SectionTitle, Card } from "@/components/AppShell";
import { HADITH_BOOKS } from "@/lib/islamic-data";
import { loadCustomContent, type CustomHadith } from "@/lib/content-store";

/** A hadith published from the admin content editor, with EN / اردو switch. */
function CustomHadithCard({ h }: { h: CustomHadith }) {
  const [urdu, setUrdu] = useState(false);
  const showUr = urdu && h.urdu;
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">{h.source}</p>
        {h.urdu && (
          <div className="flex overflow-hidden rounded-full border border-border text-[11px] font-medium" role="group" aria-label="Hadith language">
            <button onClick={() => setUrdu(false)} aria-pressed={!urdu} className={`px-2 py-0.5 transition ${!urdu ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
            <button onClick={() => setUrdu(true)} aria-pressed={urdu} className={`urdu-text px-2 py-0.5 transition ${urdu ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>اردو</button>
          </div>
        )}
      </div>
      <p dir={showUr ? "rtl" : "ltr"} className={`text-sm leading-relaxed ${showUr ? "urdu-text text-right leading-loose" : ""}`}>
        {showUr ? h.urdu : h.text}
      </p>
      {h.narrator && <p className="text-xs text-muted-foreground">Narrated by {h.narrator}</p>}
    </Card>
  );
}

export const Route = createFileRoute("/hadith/")({
  head: () => ({
    meta: [
      { title: "Hadith Collections — Bukhari, Muslim & more | Raah e Hidayath" },
      { name: "description", content: "Browse Sahih al-Bukhari, Sahih Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Muwatta Malik and the Forty Hadith collections in many languages." },
      { property: "og:title", content: "Hadith Collections | Raah e Hidayath" },
      { property: "og:description", content: "Every major hadith book, chapter by chapter, in your language." },
    ],
  }),
  component: HadithIndex,
});

function HadithIndex() {
  const [custom] = useState(() => loadCustomContent().hadiths);
  return (
    <div className="space-y-6">
      <SectionTitle title="Hadith" subtitle="The major collections of the Sunnah — chapter by chapter, in your language" />
      {custom.length > 0 && (
        <section aria-label="Hadiths added by the admin" className="space-y-3">
          <h2 className="font-display text-xl">Added by the admin</h2>
          {custom.map((h) => (
            <CustomHadithCard key={h.id} h={h} />
          ))}
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {HADITH_BOOKS.map((b, i) => (
          <Link key={b.id} to="/hadith/$bookId" params={{ bookId: b.id }} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise">
            <Card className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{b.name}</span>
                <span className="block text-xs text-muted-foreground">{b.count} narrations</span>
              </span>
              <span className="arabic-ayah shrink-0 text-lg text-primary">{b.arabic}</span>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="text-xs text-muted-foreground">
        Hadith text is served live from the open Hadith API. Collections such as Mishkat, Musnad Ahmad, Bayhaqi,
        Ibn Hibban and Musannaf Ibn Abi Shaybah are not published by any free open API yet — they will appear here
        as soon as a verified open source is available.
      </Card>
    </div>
  );
}