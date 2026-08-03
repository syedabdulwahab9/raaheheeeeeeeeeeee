import { createFileRoute } from "@tanstack/react-router";
import { Palette, Type as TypeIcon } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { AUDIO_QUALITIES, CREATORS, LANGUAGES, RECITERS, TAFSIRS, TRANSLATIONS, VOICE_PROFILES } from "@/lib/islamic-data";
import {
  ACCENT_COLORS, ARABIC_FONTS, READING_WIDTHS, THEME_COLORS, THEME_MODES, UI_FONTS, URDU_FONTS,
  type AccentColorId, type AnimationLevel, type ArabicFontId, type ReadingWidthId, type ThemeColorId,
  type ThemeMode, type UiFontId, type UrduFontId,
} from "@/lib/appearance";
import { useSettings } from "@/lib/settings";
import type { LangCode } from "@/lib/islamic-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Language, Theme & Reciter | Raah e Hidayath" },
      { name: "description", content: "Control the whole website: light, dark, AMOLED or auto theme, theme and accent colours, fonts, line spacing, reading width, animations, plus language, reciter, translation and tafsir." },
      { property: "og:title", content: "Settings | Raah e Hidayath" },
      { property: "og:description", content: "Personalise the whole app in one place." },
    ],
  }),
  component: SettingsPage,
});

/**
 * Prayer-time calculation methods used across India, each mapped to the
 * matching Fajr/Isha angle convention supported by the timings service.
 */
const METHODS = [
  { id: 1, name: "Darul Uloom Deoband, Uttar Pradesh (18° / 18°)" },
  { id: 3, name: "Islamic Fiqh Academy, New Delhi (18° / 17°)" },
  { id: 2, name: "Jamia Millia Islamia, New Delhi (15° / 15°)" },
  { id: 5, name: "Jamia Nizamia, Hyderabad (19.5° / 17.5°)" },
  { id: 4, name: "Aligarh Muslim University, Aligarh (18.5° / 90 min)" },
  { id: 7, name: "Darul Uloom Nadwatul Ulama, Lucknow (17.7° / 14°)" },
  { id: 15, name: "Markazi Ruet-e-Hilal Committee, India (moonsighting)" },
  { id: 12, name: "Jamiat Ulama-i-Hind, Delhi (12° / 12°)" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex w-full min-w-0 items-center sm:w-auto sm:max-w-[62%] sm:justify-end">{children}</div>
    </div>
  );
}

const selectClass =
  "w-full min-w-0 max-w-full truncate rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:shadow-glow sm:w-auto";



function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      onClick={() => set(!on)}
      aria-pressed={on}
      className={`h-7 w-12 shrink-0 rounded-full transition ${on ? "gradient-hero" : "bg-secondary"}`}
    >
      <span className={`block size-5 rounded-full bg-card transition ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Swatches<T extends string>({ items, value, set }: { items: readonly { id: T; label: string }[]; value: T; set: (v: T) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => set(c.id)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            value === c.id ? "border-transparent gradient-hero text-primary-foreground" : "border-border hover:text-primary"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const { settings, update, reset } = useSettings();

  return (
    <div className="space-y-6">
      <SectionTitle title="Settings" subtitle="Everything you change here applies across the whole app" />

      <Card>
        <p className="flex items-center gap-2 font-display text-lg">
          <Palette className="size-4 text-primary" /> Appearance
        </p>
        <Row label="Theme mode" hint={THEME_MODES.find((t) => t.id === settings.theme)?.hint ?? ""}>
          <Swatches
            items={THEME_MODES}
            value={settings.theme}
            set={(v: ThemeMode) => update({ theme: v })}
          />
        </Row>
        <Row label="Theme colour" hint="Primary colour of the whole site">
          <Swatches items={THEME_COLORS} value={settings.themeColor} set={(v: ThemeColorId) => update({ themeColor: v })} />
        </Row>
        <Row label="Accent colour" hint="Highlights, badges and gold details">
          <Swatches items={ACCENT_COLORS} value={settings.accentColor} set={(v: AccentColorId) => update({ accentColor: v })} />
        </Row>
        <Row label="Rounded corners" hint={`${settings.rounded.toFixed(2)}rem`}>
          <input type="range" min={0} max={2} step={0.05} value={settings.rounded}
            onChange={(e) => update({ rounded: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Animation level">
          <Swatches
            items={[{ id: "none", label: "None" }, { id: "subtle", label: "Subtle" }, { id: "full", label: "Full" }] as const}
            value={settings.animation}
            set={(v: AnimationLevel) => update({ animation: v })}
          />
        </Row>
        <Row label="Glassmorphism" hint="Frosted translucent cards and bars">
          <Toggle on={settings.glass} set={(v) => update({ glass: v })} />
        </Row>
        <Row label="Compact mode" hint="Tighter spacing, more content per screen">
          <Toggle on={settings.compact} set={(v) => update({ compact: v })} />
        </Row>
      </Card>

      <Card>
        <p className="flex items-center gap-2 font-display text-lg">
          <TypeIcon className="size-4 text-primary" /> Typography & layout
        </p>
        <Row label="Font style" hint="Interface typeface">
          <select value={settings.uiFont} onChange={(e) => update({ uiFont: e.target.value as UiFontId })} className={selectClass}>
            {UI_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Row>
        <Row label="Font size" hint={`${settings.fontSize}px`}>
          <input type="range" min={13} max={22} value={settings.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Quran font" hint="Mushaf pages">
          <select value={settings.quranFont} onChange={(e) => update({ quranFont: e.target.value as ArabicFontId })} className={selectClass}>
            {ARABIC_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Row>
        <Row label="Arabic font" hint="Ayahs, duas and adhkar">
          <select value={settings.arabicFont} onChange={(e) => update({ arabicFont: e.target.value as ArabicFontId })} className={selectClass}>
            {ARABIC_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Row>
        <Row label="Urdu font">
          <select value={settings.urduFont} onChange={(e) => update({ urduFont: e.target.value as UrduFontId })} className={selectClass}>
            {URDU_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Row>
        <Row label="Line spacing" hint={settings.lineSpacing.toFixed(1)}>
          <input type="range" min={1.6} max={3.4} step={0.1} value={settings.lineSpacing}
            onChange={(e) => update({ lineSpacing: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Reading width">
          <Swatches items={READING_WIDTHS} value={settings.readingWidth} set={(v: ReadingWidthId) => update({ readingWidth: v })} />
        </Row>
      </Card>

      <Card>
        <p className="font-display text-lg">Quran & audio</p>
        <Row label="Language" hint="Translations, tafseer and interface">
          <select value={settings.lang} onChange={(e) => update({ lang: e.target.value as LangCode })} className={selectClass}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} — {l.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Preferred translation">
          <select value={settings.translationEdition} onChange={(e) => update({ translationEdition: e.target.value })} className={selectClass}>
            <option value="auto">Automatic</option>
            {TRANSLATIONS.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.lang.toUpperCase()})</option>)}
          </select>
        </Row>
        <Row label="Preferred tafsir">
          <select value={settings.tafsirSlug} onChange={(e) => update({ tafsirSlug: e.target.value })} className={selectClass}>
            <option value="auto">Automatic</option>
            {TAFSIRS.map((t) => <option key={t.slug} value={t.slug}>{t.name} ({t.lang.toUpperCase()})</option>)}
          </select>
        </Row>
        <Row label="Preferred reciter" hint="Voice used for Quran audio">
          <select value={settings.reciter} onChange={(e) => update({ reciter: e.target.value })} className={selectClass}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Narration voice" hint="Translation, tafseer and explanation audio">
          <select value={settings.voiceProfile} onChange={(e) => update({ voiceProfile: e.target.value })} className={selectClass}>
            {VOICE_PROFILES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </Row>
        <Row label="Audio quality">
          <select
            value={settings.audioQuality}
            onChange={(e) => update({ audioQuality: Number(e.target.value) as 32 | 64 | 128 | 192 })}
            className={selectClass}
          >
            {AUDIO_QUALITIES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
          </select>
        </Row>
        <Row label="Playback speed" hint={`${settings.playbackSpeed.toFixed(2)}×`}>
          <input type="range" min={0.5} max={2} step={0.05} value={settings.playbackSpeed}
            onChange={(e) => update({ playbackSpeed: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Repeat verses" hint={`${settings.repeatVerses}× each`}>
          <input type="range" min={1} max={10} value={settings.repeatVerses}
            onChange={(e) => update({ repeatVerses: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Auto-scroll"><Toggle on={settings.autoScroll} set={(v) => update({ autoScroll: v })} /></Row>
        <Row label="Tajweed colours"><Toggle on={settings.tajweedColors} set={(v) => update({ tajweedColors: v })} /></Row>
        <Row label="Word-by-word mode"><Toggle on={settings.wordByWord} set={(v) => update({ wordByWord: v })} /></Row>
        <Row label="Memorization mode"><Toggle on={settings.memorization} set={(v) => update({ memorization: v })} /></Row>
        <Row label="Daily reading goal" hint={`${settings.dailyGoalPages} pages a day`}>
          <input type="range" min={1} max={30} value={settings.dailyGoalPages}
            onChange={(e) => update({ dailyGoalPages: Number(e.target.value) })} className="accent-primary" />
        </Row>
        <Row label="Daily verse notifications">
          <Toggle on={settings.dailyVerseNotifications} set={(v) => update({ dailyVerseNotifications: v })} />
        </Row>
        <Row label="Reading history"><Toggle on={settings.keepHistory} set={(v) => update({ keepHistory: v })} /></Row>
        <Row label="Auto-bookmark last read"><Toggle on={settings.autoBookmark} set={(v) => update({ autoBookmark: v })} /></Row>
        <Row label="Arabic font size" hint={`${settings.arabicSize}px`}>
          <input
            type="range"
            min={20}
            max={54}
            value={settings.arabicSize}
            onChange={(e) => update({ arabicSize: Number(e.target.value) })}
            className="accent-primary"
          />
        </Row>
        <Row label="Transliteration">
          <Toggle on={settings.showTransliteration} set={(v) => update({ showTransliteration: v })} />
        </Row>
      </Card>

      <Card>
        <p className="font-display text-lg">Prayer times</p>
        <Row label="City">
          <input value={settings.city} onChange={(e) => update({ city: e.target.value })} className={selectClass} />
        </Row>
        <Row label="Country">
          <input value={settings.country} onChange={(e) => update({ country: e.target.value })} className={selectClass} />
        </Row>
        <Row label="Calculation method">
          <select value={settings.method} onChange={(e) => update({ method: Number(e.target.value) })} className={selectClass}>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Row>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Reset all settings</p>
          <p className="text-xs text-muted-foreground">Restore the default language, theme and reciter.</p>
        </div>
        <button onClick={reset} className="rounded-full border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
          Reset
        </button>
      </Card>

      <Card className="text-center text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground">Raah e Hidayath</p>
        <p className="mt-1">Developed by {CREATORS.join(" · ")}</p>
      </Card>
    </div>
  );
}