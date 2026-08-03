import { useState } from "react";
import { Building2, Music4, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "@/components/AppShell";
import { DEFAULT_SITE, spotifyEmbed, useSiteConfig, type SiteConfig, type SpotifyEntry } from "@/lib/site-config";

const FIELD =
  "min-h-11 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary";
const LABEL = "mb-1 block text-xs font-medium text-muted-foreground";

const TEXT_FIELDS: Array<{ key: keyof SiteConfig; label: string; hint?: string; area?: boolean }> = [
  { key: "siteName", label: "Website name" },
  { key: "tagline", label: "Tagline" },
  { key: "homeHeroTitle", label: "Home heading" },
  { key: "homeHeroSubtitle", label: "Home subheading", area: true },
  { key: "naatsTitle", label: "Naats & Nasheeds heading" },
  { key: "naatsSubtitle", label: "Naats & Nasheeds subheading" },
  { key: "naatsIntro", label: "Naats intro paragraph", area: true },
  { key: "naatsVerse", label: "Naats page Arabic verse", area: true },
  { key: "naatsVerseRef", label: "Verse translation & reference", area: true },
  { key: "footerNote", label: "Footer note" },
  { key: "contactEmail", label: "Contact email" },
];

const uid = () => `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function AdminSiteEditor() {
  const [site, save, reset] = useSiteConfig();
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<SpotifyEntry>({ id: "", uri: "", kind: "playlist", title: "", note: "" });

  const patch = (key: keyof SiteConfig, value: string) => {
    save({ ...site, [key]: value });
    setStatus("Saved — the website updated instantly.");
  };

  const patchSpotify = (list: SpotifyEntry[], message: string) => {
    save({ ...site, spotify: list });
    setStatus(message);
  };

  const addSpotify = () => {
    if (!draft.uri.trim() || !draft.title.trim()) {
      setStatus("A title and a Spotify link are both needed.");
      return;
    }
    patchSpotify([...site.spotify, { ...draft, id: uid() }], "Spotify player added to the nasheeds page.");
    setDraft({ id: "", uri: "", kind: "playlist", title: "", note: "" });
  };

  return (
    <section aria-labelledby="site-editor-heading" className="space-y-3">
      <h2 id="site-editor-heading" className="flex items-center gap-2 font-display text-xl">
        <Building2 className="size-5 text-primary" aria-hidden /> Website content & branding
      </h2>

      <Card className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rewrite any text shown on the website — the name, the tagline, the home page headings and every word of the
          Naats &amp; Nasheeds section. Changes apply immediately, no code needed.
        </p>

        {status && (
          <p role="status" className="text-sm text-primary">
            {status}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {TEXT_FIELDS.map(({ key, label, area }) => (
            <label key={key} className={area ? "sm:col-span-2" : ""}>
              <span className={LABEL}>{label}</span>
              {area ? (
                <textarea
                  className={`${FIELD} min-h-24`}
                  value={String(site[key] ?? "")}
                  onChange={(e) => patch(key, e.target.value)}
                />
              ) : (
                <input className={FIELD} value={String(site[key] ?? "")} onChange={(e) => patch(key, e.target.value)} />
              )}
            </label>
          ))}
        </div>

        <button
          onClick={() => {
            reset();
            setStatus("Restored the original website text.");
          }}
          className={`${BTN} border border-border hover:text-primary`}
        >
          <RotateCcw className="size-4" aria-hidden /> Reset to defaults
        </button>
      </Card>

      <Card className="space-y-4">
        <h3 className="flex items-center gap-2 font-display text-lg">
          <Music4 className="size-5 text-primary" aria-hidden /> Spotify players on the nasheeds page
        </h3>
        <p className="text-sm text-muted-foreground">
          Paste any Spotify playlist, album or track link — vocals-only nasheeds only, please. Each one becomes a full
          player card on the Naats &amp; Nasheeds page.
        </p>

        {site.spotify.length > 0 && (
          <ul className="divide-y divide-border/60">
            {site.spotify.map((entry) => {
              const parsed = spotifyEmbed(entry);
              return (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-medium">{entry.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.kind} · {parsed ? parsed.open : "invalid link"}
                    </span>
                  </span>
                  <button
                    onClick={() =>
                      patchSpotify(
                        site.spotify.filter((s) => s.id !== entry.id),
                        "Removed from the nasheeds page.",
                      )
                    }
                    aria-label={`Delete ${entry.title}`}
                    className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={LABEL}>Title</span>
            <input
              className={FIELD}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Arabic Nasheeds — Vocals Only"
            />
          </label>
          <label>
            <span className={LABEL}>Type</span>
            <select
              className={FIELD}
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as SpotifyEntry["kind"] })}
            >
              <option value="playlist">Playlist</option>
              <option value="album">Album</option>
              <option value="track">Single track</option>
              <option value="artist">Artist</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={LABEL}>Spotify link or id</span>
            <input
              className={FIELD}
              value={draft.uri}
              onChange={(e) => setDraft({ ...draft, uri: e.target.value })}
              placeholder="https://open.spotify.com/playlist/…"
            />
          </label>
          <label className="sm:col-span-2">
            <span className={LABEL}>Short description</span>
            <input
              className={FIELD}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="A cappella nasheeds — human voice only, no instruments."
            />
          </label>
        </div>

        <button onClick={addSpotify} className={`${BTN} gradient-hero text-primary-foreground`}>
          <Plus className="size-4" aria-hidden /> Add Spotify player
        </button>

        <p className="text-xs text-muted-foreground">
          Defaults shipped with the app: {DEFAULT_SITE.spotify.length} vocals-only playlists.
        </p>
      </Card>
    </section>
  );
}
