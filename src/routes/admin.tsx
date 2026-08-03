import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Music4,
  ScanBarcode,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { AdminContentEditor } from "@/components/AdminContentEditor";
import { AdminSiteEditor } from "@/components/AdminSiteEditor";
import { FEATURE_META, defaultFeatureFlags, readFlags, writeFlags } from "@/lib/feature-flags";
import { CREATORS, HADITH_BOOKS, LANGUAGES, RECITERS, VOICE_PROFILES } from "@/lib/islamic-data";
import { HALAL_ITEMS } from "@/lib/halal-data";
import { NASHEEDS } from "@/lib/nasheed-data";
import { PROPHETS } from "@/lib/extra-data";
import { useSettings } from "@/lib/settings";

const CALCULATION_METHODS = [
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura, Makkah" },
  { id: 5, name: "Egyptian General Authority" },
  { id: 8, name: "Gulf Region" },
  { id: 12, name: "Union des Organisations Islamiques de France" },
  { id: 15, name: "Moonsighting Committee" },
];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel | Raah e Hidayath" },
      { name: "description", content: "Administrator dashboard for managing content, languages, reciters and announcements in Raah e Hidayath." },
      { property: "og:title", content: "Admin Panel | Raah e Hidayath" },
      { property: "og:description", content: "Manage the Raah e Hidayath app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const SESSION_KEY = "reh-admin-session";
const ADMIN_USER = "rahehidayath";
const ADMIN_PASS = "w@964000";

const FIELD =
  "min-h-11 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function Admin() {
  const { settings, update, reset } = useSettings();
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [status, setStatus] = useState("");
  const [flags, setFlags] = useState<Record<string, boolean>>(defaultFeatureFlags);

  const userId = useId();
  const passId = useId();
  const errorId = useId();
  const announcementId = useId();
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
      setAnnouncement(localStorage.getItem("reh-announcement") ?? "");
    } catch {
      /* ignore */
    }
    setFlags({ ...readFlags() });
  }, []);

  const saveFlags = (next: Record<string, boolean>, message: string) => {
    setFlags(next);
    writeFlags(next);
    setStatus(message);
  };

  const toggleFlag = (to: string) => {
    saveFlags(
      { ...flags, [to]: flags[to] === false },
      "Visibility updated — the whole site changed instantly.",
    );
  };

  const setAll = (value: boolean) => {
    saveFlags(
      Object.fromEntries(FEATURE_META.map((f) => [f.to, value])),
      value ? "Everything is now visible across the site." : "Everything is now hidden across the site.",
    );
  };


  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect username or password. Please try again.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
    setUser("");
    setPass("");
    setStatus("");
  };

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-10">
        <SectionTitle title="Admin Login" subtitle="Authorised personnel only" />
        <Card>
          <form onSubmit={login} className="space-y-4" aria-describedby={error ? errorId : undefined}>
            <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
            <h2 className="sr-only">Sign in to the admin panel</h2>

            <div className="space-y-1.5">
              <label htmlFor={userId} className="block text-sm font-medium">
                Username
              </label>
              <input
                id={userId}
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                aria-invalid={error ? true : undefined}
                className={FIELD}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={passId} className="block text-sm font-medium">
                Password
              </label>
              <input
                id={passId}
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                className={FIELD}
              />
            </div>

            <p
              id={errorId}
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className={`text-sm text-destructive ${error ? "" : "sr-only"}`}
            >
              {error}
            </p>

            <button type="submit" className={`${BTN} w-full gradient-hero text-primary-foreground`}>
              Sign in
            </button>
          </form>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Surahs", value: 114, icon: BookOpen },
    { label: "Ayaat", value: 6236, icon: LayoutDashboard },
    { label: "Hadith books", value: HADITH_BOOKS.length, icon: BookOpen },
    { label: "Languages", value: LANGUAGES.length, icon: Users },
    { label: "Reciters", value: RECITERS.length, icon: Settings2 },
    { label: "Nasheeds", value: NASHEEDS.length, icon: Music4 },
    { label: "Prophets", value: PROPHETS.length, icon: Users },
    { label: "Halal rulings", value: HALAL_ITEMS.length, icon: ShieldCheck },
  ];

  const sections = [
    { to: "/naats", label: "Naats & Salawat", icon: Music4 },
    { to: "/scanner", label: "Barcode Scanner", icon: ScanBarcode },
    { to: "/prophets", label: "Prophets & Families", icon: Users },
    { to: "/quran", label: "Quran", icon: BookOpen },
    { to: "/hadith", label: "Hadith", icon: BookOpen },
    { to: "/ramadan", label: "Ramadan & Fasting", icon: LayoutDashboard },
    { to: "/zakat", label: "Zakat Calculator", icon: LayoutDashboard },
    { to: "/quiz", label: "Islamic Quiz", icon: LayoutDashboard },
    { to: "/wheel", label: "Good Deed Wheel", icon: LayoutDashboard },
    { to: "/settings", label: "App Settings", icon: Settings2 },
    { to: "/halal", label: "Halal or Haram", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Admin Dashboard" subtitle={`Signed in as ${ADMIN_USER}`} />
        <button onClick={logout} className={`${BTN} border border-border hover:text-primary`}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>

      <p aria-live="polite" className={`text-sm text-primary ${status ? "" : "sr-only"}`}>
        {status}
      </p>

      <section aria-labelledby="stats-heading" className="space-y-3">
        <h2 id="stats-heading" className="font-display text-xl">
          Content at a glance
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(({ label, value, icon: Icon }) => (
            <li key={label}>
              <Card className="text-center">
                <Icon className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-2 font-display text-2xl">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sections-heading" className="space-y-3">
        <h2 id="sections-heading" className="font-display text-xl">
          Manage sections
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {sections.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="flex min-h-16 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-medium">{label}</span>
                  <ExternalLink className="ml-auto size-4 text-muted-foreground" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdminSiteEditor />

      <AdminContentEditor />

      <section aria-labelledby="features-heading" className="space-y-3">
        <h2 id="features-heading" className="font-display text-xl">
          Full site control — show, hide or remove anything
        </h2>
        <Card className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every page, tool, navigation tab and home-page block of the app is listed here. Turning something off
            removes it instantly from the whole site — the bottom navigation, the home page and the More page.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setAll(true)} className={`${BTN} gradient-hero text-primary-foreground`}>
              Show everything
            </button>
            <button onClick={() => setAll(false)} className={`${BTN} border border-border hover:text-primary`}>
              Hide everything
            </button>
            <button
              onClick={() => saveFlags(defaultFeatureFlags(), "Visibility reset to the defaults.")}
              className={`${BTN} border border-border hover:text-primary`}
            >
              Reset to default
            </button>
          </div>

          {["Main", "Tools", "Home page"].map((group) => (
            <div key={group}>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group}</p>
              <ul className="divide-y divide-border/60">
                {FEATURE_META.filter((f) => f.group === group).map(({ to, label }) => {
                  const on = flags[to] !== false;
                  return (
                    <li key={to} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm font-medium">{label}</span>
                      <button
                        role="switch"
                        aria-checked={on}
                        aria-label={`Toggle ${label}`}
                        onClick={() => toggleFlag(to)}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "gradient-hero" : "bg-secondary"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-6 rounded-full bg-card shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Card>
      </section>


      <section aria-labelledby="site-settings-heading" className="space-y-3">
        <h2 id="site-settings-heading" className="font-display text-xl">
          Site settings
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="font-display text-lg">Appearance</h3>
            <SelectRow
              label="Theme"
              value={settings.theme}
              onChange={(v) => update({ theme: v as typeof settings.theme })}
              options={[
                ["light", "Light"],
                ["dark", "Dark"],
                ["auto", "Follow device"],
              ]}
            />
            <SelectRow
              label="Primary colour"
              value={settings.themeColor}
              onChange={(v) => update({ themeColor: v as typeof settings.themeColor })}
              options={[
                ["emerald", "Emerald"],
                ["teal", "Teal"],
                ["navy", "Navy"],
                ["maroon", "Maroon"],
              ]}
            />
            <NumberRow
              label="Base font size"
              value={settings.fontSize}
              min={12}
              max={22}
              onChange={(v) => update({ fontSize: v })}
            />
            <NumberRow
              label="Arabic size"
              value={settings.arabicSize}
              min={20}
              max={54}
              onChange={(v) => update({ arabicSize: v })}
            />
          </Card>

          <Card className="space-y-3">
            <h3 className="font-display text-lg">Language &amp; audio</h3>
            <SelectRow
              label="Default language"
              value={settings.lang}
              onChange={(v) => update({ lang: v as typeof settings.lang })}
              options={LANGUAGES.map((l) => [l.code, l.label] as [string, string])}
            />
            <SelectRow
              label="Reciter"
              value={settings.reciter}
              onChange={(v) => update({ reciter: v })}
              options={RECITERS.map((r) => [r.id, r.name] as [string, string])}
            />
            <SelectRow
              label="Narration voice"
              value={settings.voiceProfile}
              onChange={(v) => update({ voiceProfile: v })}
              options={VOICE_PROFILES.map((v) => [v.id, v.label] as [string, string])}
            />
            <NumberRow
              label="Playback speed"
              value={settings.playbackSpeed}
              min={0.5}
              max={2}
              step={0.1}
              onChange={(v) => update({ playbackSpeed: v })}
            />
          </Card>

          <Card className="space-y-3">
            <h3 className="font-display text-lg">Prayer location</h3>
            <TextRow label="City" value={settings.city} onChange={(v) => update({ city: v })} />
            <TextRow label="Country" value={settings.country} onChange={(v) => update({ country: v })} />
            <SelectRow
              label="Calculation method"
              value={String(settings.method)}
              onChange={(v) => update({ method: Number(v) })}
              options={CALCULATION_METHODS.map((m) => [String(m.id), m.name] as [string, string])}
            />
          </Card>

          <Card className="space-y-2">
            <h3 className="font-display text-lg">Reading features</h3>
            {(
              [
                ["showTransliteration", "Show transliteration"],
                ["tajweedColors", "Tajweed colours"],
                ["wordByWord", "Word by word"],
                ["autoScroll", "Auto scroll while playing"],
                ["memorization", "Memorisation mode"],
                ["dailyVerseNotifications", "Daily verse reminder"],
                ["offlineDownloads", "Allow offline downloads"],
                ["keepHistory", "Keep reading history"],
                ["autoBookmark", "Auto bookmark last read"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={(e) => update({ [key]: e.target.checked } as never)}
                  className="size-5 accent-[hsl(var(--primary))]"
                />
              </label>
            ))}
            <button
              onClick={() => {
                reset();
                setStatus("All site settings were restored to their defaults.");
              }}
              className={`${BTN} mt-2 w-full border border-border hover:text-primary`}
            >
              Restore default settings
            </button>
          </Card>
        </div>
      </section>

      <section aria-labelledby="announcement-heading">
        <Card>
          <h2 id="announcement-heading" className="font-display text-lg">
            Home announcement
          </h2>
          <label htmlFor={announcementId} className="mt-1 block text-xs text-muted-foreground">
            Shown as a banner on the home page for all users of this device.
          </label>
          <textarea
            id={announcementId}
            rows={3}
            value={announcement}
            onChange={(e) => {
              setAnnouncement(e.target.value);
              setStatus("");
            }}
            className={`${FIELD} mt-3`}
            placeholder="e.g. Ramadan timetable is now available"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                try {
                  localStorage.setItem("reh-announcement", announcement);
                  setStatus("Announcement saved.");
                } catch {
                  setStatus("Could not save the announcement on this device.");
                }
              }}
              className={`${BTN} gradient-hero text-primary-foreground`}
            >
              Save announcement
            </button>
            <button
              onClick={() => {
                setAnnouncement("");
                try {
                  localStorage.removeItem("reh-announcement");
                  setStatus("Announcement cleared.");
                } catch {
                  /* ignore */
                }
              }}
              className={`${BTN} border border-border hover:text-primary`}
            >
              Clear
            </button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="sources-heading">
        <Card>
          <h2 id="sources-heading" className="font-display text-lg">
            Content sources
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Quran text, translations &amp; audio — alquran.cloud</li>
            <li>Tafseer — spa5k tafsir_api (Ibn Kathir, Mokhtasar and more)</li>
            <li>Hadith collections — fawazahmed0 hadith-api</li>
            <li>Prayer times, Qibla, Hijri calendar &amp; Asma ul Husna — aladhan.com</li>
            <li>Barcode origins — GS1 country prefix table</li>
            <li>Islamic AI assistant — Lovable AI Gateway</li>
          </ul>
        </Card>
      </section>

      <section aria-labelledby="support-heading">
        <Card>
          <h2 id="support-heading" className="flex items-center gap-2 font-display text-lg">
            <Mail className="size-4 text-primary" aria-hidden /> Support inbox
          </h2>
          <a
            href="mailto:rahehidayath@gmail.com"
            className="mt-1 inline-flex min-h-11 items-center text-sm text-primary underline outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            rahehidayath@gmail.com
          </a>
          <p className="mt-3 text-xs text-muted-foreground">App maintained by {CREATORS.join(", ")}.</p>
        </Card>
      </section>
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD} />
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
