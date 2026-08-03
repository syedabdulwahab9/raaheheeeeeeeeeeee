import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { fetchHadithEditions, fetchHadithInfo, fetchHadithSection } from "@/lib/quran-api";
import { HADITH_BOOKS, LANGUAGES, getLanguage } from "@/lib/islamic-data";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/hadith/$bookId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.bookId} hadith collection | Raah e Hidayath` },
      { name: "description", content: "Read this hadith collection chapter by chapter with translation in your language." },
      { property: "og:title", content: `Hadith — ${params.bookId} | Raah e Hidayath` },
      { property: "og:description", content: "Authentic hadith, chapter by chapter." },
    ],
  }),
  component: HadithBook,
});

function HadithBook() {
  const { bookId } = Route.useParams();
  const { settings } = useSettings();
  /* Language here is local to the hadith section only — changing it never
     touches the rest of the site (home, Quran, Ibadaat, nav stay as they are). */
  const [langCode, setLangCode] = useState(settings.lang);
  const lang = getLanguage(langCode);
  const [section, setSection] = useState("1");
  const book = HADITH_BOOKS.find((b) => b.id === bookId);

  const info = useQuery({ queryKey: ["hadith-info", bookId], queryFn: () => fetchHadithInfo(bookId), staleTime: Infinity });
  const editions = useQuery({
    queryKey: ["hadith-editions", bookId],
    queryFn: () => fetchHadithEditions(bookId),
    staleTime: Infinity,
  });
  const data = useQuery({
    queryKey: ["hadith", bookId, langCode, section, editions.data?.length ?? 0],
    queryFn: () => fetchHadithSection(bookId, langCode, section, editions.data),
    staleTime: 1000 * 60 * 30,
    enabled: !editions.isLoading,
  });

  const sections = Object.entries(info.data?.sections ?? {}).filter(([, name]) => name);

  /* Only offer languages this collection is actually translated into — Urdu is
   * always offered because we fall back to a sister Urdu edition when needed. */
  const availableLangs = editions.data
    ? LANGUAGES.filter(
        (l) => l.code === "ur" || editions.data.some((e) => e.language.toLowerCase() === l.label.toLowerCase()),
      )
    : LANGUAGES;
  const usedEdition = data.data?.edition ?? "";
  const usedLanguage = editions.data?.find((e) => e.name === usedEdition)?.language ?? "";
  const fellBack = Boolean(usedLanguage) && usedLanguage.toLowerCase() !== lang.label.toLowerCase();
  const rtlText = /^(ara|urd|fas|per)/.test(usedEdition) || (usedEdition.startsWith("ara") ?? false);


  return (
    <div className="space-y-6">
      <Link to="/hadith" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="size-4" /> All collections
      </Link>
      <SectionTitle title={book?.name ?? bookId} subtitle={book?.arabic} />

      <Card className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Language</span>
          <select
            value={langCode}
            onChange={(e) => setLangCode(e.target.value as typeof settings.lang)}
            className="rounded-lg border border-border bg-background px-2 py-1"
          >
            {availableLangs.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-muted-foreground">Chapter</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1"
          >
            {sections.map(([k, name]) => (
              <option key={k} value={k}>
                {k}. {name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {fellBack && (
        <p role="status" className="text-sm text-muted-foreground">
          {book?.name ?? bookId} is not translated into {lang.label} in our source, so it is being shown in{" "}
          {usedLanguage}.
        </p>
      )}

      {data.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-border bg-card shimmer" />
          ))}
        </div>
      )}
      {data.error && <Card className="text-sm text-destructive">{(data.error as Error).message}</Card>}

      <div className="space-y-3">
        {data.data?.hadiths?.map((h) => (
          <Card key={h.hadithnumber} className="animate-rise">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Hadith {h.hadithnumber}</span>
              {h.reference && (
                <span>
                  Book {h.reference.book} · No. {h.reference.hadith}
                </span>
              )}
            </div>
            <p
              dir={rtlText ? "rtl" : "ltr"}
              className={`mt-3 text-[15px] leading-relaxed ${
                usedEdition.startsWith("urd")
                  ? "urdu-text text-right"
                  : rtlText
                    ? "arabic-ayah text-right"
                    : ""
              }`}
            >
              {h.text}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}