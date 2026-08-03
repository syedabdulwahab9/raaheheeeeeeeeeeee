import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Mic2, Quote } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { spotifyEmbed, useSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/naats")({
  head: () => ({
    meta: [
      { title: "Naats & Nasheeds — 100% Human Voice, No Music | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Beautiful naats, nasheeds and salawat sung with the human voice only — no music, no instruments. Play full vocals-only Spotify playlists and tracks right on the page.",
      },
      { property: "og:title", content: "Naats & Nasheeds — Vocals Only | Raah e Hidayath" },
      {
        property: "og:description",
        content: "Vocals-only naats and nasheeds, playable in-page through Spotify.",
      },
      { property: "og:type", content: "music.playlist" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Naats,
});

function Naats() {
  const [site] = useSiteConfig();

  const spotifyCards = site.spotify
    .map((entry) => ({ entry, embed: spotifyEmbed(entry) }))
    .filter((x): x is { entry: (typeof site.spotify)[number]; embed: { embed: string; open: string } } =>
      Boolean(x.embed),
    );

  return (
    <div className="space-y-6">
      <SectionTitle title={site.naatsTitle} subtitle={site.naatsSubtitle} />

      <Card className="gradient-hero text-primary-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Quote className="size-10 shrink-0 text-accent" aria-hidden />
          <div>
            <p dir="rtl" lang="ar" className="font-display text-xl leading-loose">
              {site.naatsVerse}
            </p>
            <p className="mt-2 text-sm text-primary-foreground/85">{site.naatsVerseRef}</p>
            <p className="mt-3 text-xs text-primary-foreground/75">{site.naatsIntro}</p>
          </div>
        </div>
      </Card>

      {/* ---------------- Spotify: full players, vocals only ---------------- */}
      <section aria-labelledby="spotify-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Mic2 className="size-5 text-primary" aria-hidden />
          <h2 id="spotify-heading" className="font-display text-xl">
            Listen on Spotify — voice only
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Full players, straight on this page. Every playlist below is a cappella: the human voice and nothing else.
        </p>

        <ul className="nasheed-grid list-none p-0">
          {spotifyCards.map(({ entry, embed }) => (
            <li key={entry.id}>
              <Card className="nasheed-card gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base leading-snug">{entry.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    No music
                  </span>
                </div>

                <div className="nasheed-embed mt-auto border border-border">
                  <iframe
                    src={embed.embed}
                    title={`${entry.title} — vocals only Spotify player`}
                    height={entry.kind === "track" ? 152 : 352}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    style={{ height: entry.kind === "track" ? 152 : 352 }}
                  />
                </div>

                <a
                  href={embed.open}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Open in Spotify <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Card>
            </li>
          ))}
        </ul>
        {spotifyCards.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No Spotify playlists are configured yet. Add them in the admin panel.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
