import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, SectionTitle } from "@/components/AppShell";
import { fetchAsmaUlHusna } from "@/lib/quran-api";

export const Route = createFileRoute("/names")({
  head: () => ({
    meta: [
      { title: "99 Names of Allah — Asma ul Husna | Raah e Hidayath" },
      { name: "description", content: "All 99 beautiful names of Allah with Arabic, transliteration and the meaning in every language of the app." },
      { property: "og:title", content: "Asma ul Husna | Raah e Hidayath" },
      { property: "og:description", content: "The 99 names of Allah with meanings in your language." },
    ],
  }),
  component: Names,
});

function Names() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["asma"], queryFn: fetchAsmaUlHusna, staleTime: Infinity });

  const list = (data ?? []).filter(
    (n) =>
      !q ||
      n.transliteration.toLowerCase().includes(q.toLowerCase()) ||
      n.en.meaning.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Asma ul Husna" subtitle="The 99 beautiful names of Allah with their meanings" />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a name or meaning…"
        className="w-full min-w-0 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft outline-none focus:shadow-glow"
      />

      {isLoading && <div className="h-40 rounded-2xl border border-border bg-card shimmer" />}
      {error && <Card className="text-sm text-destructive">Couldn't load the names. Please retry.</Card>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((n) => (
          <Card key={n.number} className="animate-rise text-center">
            <span className="text-xs text-muted-foreground">{n.number}</span>
            <p className="arabic-ayah mt-1 text-3xl text-primary">{n.name}</p>
            <p className="mt-2 font-semibold">{n.transliteration}</p>
            <p className="text-xs text-muted-foreground">{n.en.meaning}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
