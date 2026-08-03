/** Central appearance + reading-preference engine. Every option the user can
 *  change in Settings is turned into a CSS variable / data-attribute on <html>,
 *  so the whole website reacts instantly and consistently. */

export type ThemeMode =
  | "light"
  | "dark"
  | "amoled"
  | "sepia"
  | "emerald-night"
  | "ocean"
  | "desert"
  | "rose-dusk"
  | "mocha"
  | "auto";
export type AnimationLevel = "none" | "subtle" | "full";

export const THEME_MODES: Array<{ id: ThemeMode; label: string; hint: string }> = [
  { id: "light", label: "Light", hint: "Bright parchment look" },
  { id: "dark", label: "Dark", hint: "Soft night reading" },
  { id: "amoled", label: "AMOLED", hint: "True black, saves battery" },
  { id: "sepia", label: "Sepia Paper", hint: "Warm old-manuscript paper" },
  { id: "emerald-night", label: "Emerald Night", hint: "Deep green masjid night" },
  { id: "ocean", label: "Ocean Blue", hint: "Calm deep-blue night" },
  { id: "desert", label: "Desert Sand", hint: "Soft sand and dune tones" },
  { id: "rose-dusk", label: "Rose Dusk", hint: "Gentle rose evening light" },
  { id: "mocha", label: "Mocha", hint: "Warm cocoa comfort" },
  { id: "auto", label: "Auto", hint: "Follows your device" },
];

export const THEME_COLORS = [
  { id: "emerald", label: "Emerald", primary: "0.46 0.09 167", ring: "0.55 0.08 167" },
  { id: "teal", label: "Teal", primary: "0.48 0.08 195", ring: "0.57 0.07 195" },
  { id: "royal", label: "Royal Blue", primary: "0.45 0.12 258", ring: "0.55 0.11 258" },
  { id: "maroon", label: "Maroon", primary: "0.42 0.13 20", ring: "0.52 0.12 20" },
  { id: "midnight", label: "Midnight", primary: "0.33 0.06 265", ring: "0.45 0.06 265" },
  { id: "olive", label: "Olive", primary: "0.48 0.08 130", ring: "0.57 0.07 130" },
  { id: "sapphire", label: "Sapphire", primary: "0.42 0.14 245", ring: "0.53 0.13 245" },
  { id: "plum", label: "Plum", primary: "0.42 0.12 320", ring: "0.53 0.11 320" },
  { id: "copper", label: "Copper", primary: "0.52 0.12 55", ring: "0.60 0.11 55" },
  { id: "forest", label: "Forest", primary: "0.40 0.09 150", ring: "0.50 0.08 150" },
  { id: "indigo", label: "Indigo", primary: "0.40 0.13 275", ring: "0.51 0.12 275" },
  { id: "slate", label: "Graphite", primary: "0.38 0.02 250", ring: "0.50 0.02 250" },
] as const;

export const ACCENT_COLORS = [
  { id: "gold", label: "Gold", accent: "0.82 0.13 85" },
  { id: "amber", label: "Amber", accent: "0.80 0.15 70" },
  { id: "rose", label: "Rose", accent: "0.75 0.13 15" },
  { id: "sky", label: "Sky", accent: "0.78 0.10 220" },
  { id: "mint", label: "Mint", accent: "0.83 0.10 160" },
  { id: "violet", label: "Violet", accent: "0.72 0.13 300" },
  { id: "turquoise", label: "Turquoise", accent: "0.80 0.11 190" },
  { id: "sand", label: "Sand", accent: "0.86 0.07 90" },
  { id: "coral", label: "Coral", accent: "0.76 0.14 35" },
  { id: "lime", label: "Lime", accent: "0.85 0.14 130" },
  { id: "pearl", label: "Pearl", accent: "0.92 0.02 250" },
] as const;

export const UI_FONTS = [
  { id: "jakarta", label: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' },
  { id: "inter", label: "Inter", stack: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: "serif", label: "Classic Serif", stack: '"Marcellus", ui-serif, Georgia, serif' },
  { id: "system", label: "System", stack: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { id: "cairo", label: "Cairo", stack: 'Cairo, ui-sans-serif, system-ui, sans-serif' },
  { id: "manrope", label: "Manrope", stack: 'Manrope, ui-sans-serif, system-ui, sans-serif' },
  { id: "outfit", label: "Outfit", stack: 'Outfit, ui-sans-serif, system-ui, sans-serif' },
  { id: "lora", label: "Lora (Reading Serif)", stack: 'Lora, ui-serif, Georgia, serif' },
  { id: "playfair", label: "Playfair Display", stack: '"Playfair Display", ui-serif, Georgia, serif' },
  { id: "sourceserif", label: "Source Serif 4", stack: '"Source Serif 4", ui-serif, Georgia, serif' },
  { id: "mono", label: "Space Mono", stack: '"Space Mono", ui-monospace, SFMono-Regular, monospace' },
] as const;

/** Quran / Arabic mushaf typefaces. */
export const ARABIC_FONTS = [
  { id: "amiri-quran", label: "Amiri Quran (Uthmani)", stack: '"Amiri Quran", "Amiri", serif' },
  { id: "scheherazade", label: "Scheherazade New (Indo-Pak)", stack: '"Scheherazade New", "Amiri", serif' },
  { id: "noto-naskh", label: "Noto Naskh Arabic", stack: '"Noto Naskh Arabic", serif' },
  { id: "lateef", label: "Lateef", stack: 'Lateef, "Noto Naskh Arabic", serif' },
  { id: "reem", label: "Reem Kufi", stack: '"Reem Kufi", "Amiri", serif' },
  { id: "cairo-ar", label: "Cairo Arabic", stack: 'Cairo, "Noto Naskh Arabic", sans-serif' },
  { id: "kufam", label: "Kufam", stack: 'Kufam, "Amiri", serif' },
] as const;

export const URDU_FONTS = [
  { id: "nastaliq", label: "Noto Nastaliq Urdu", stack: '"Noto Nastaliq Urdu", serif' },
  { id: "naskh", label: "Noto Naskh Arabic", stack: '"Noto Naskh Arabic", serif' },
  { id: "lateef", label: "Lateef", stack: 'Lateef, serif' },
  { id: "gulzar", label: "Gulzar", stack: 'Gulzar, "Noto Nastaliq Urdu", serif' },
  { id: "amiri-ur", label: "Amiri", stack: 'Amiri, "Noto Naskh Arabic", serif' },
] as const;

export const READING_WIDTHS = [
  { id: "narrow", label: "Narrow", value: "44rem" },
  { id: "medium", label: "Medium", value: "58rem" },
  { id: "wide", label: "Wide", value: "72rem" },
  { id: "full", label: "Full", value: "100%" },
] as const;

export type ThemeColorId = (typeof THEME_COLORS)[number]["id"];
export type AccentColorId = (typeof ACCENT_COLORS)[number]["id"];
export type UiFontId = (typeof UI_FONTS)[number]["id"];
export type ArabicFontId = (typeof ARABIC_FONTS)[number]["id"];
export type UrduFontId = (typeof URDU_FONTS)[number]["id"];
export type ReadingWidthId = (typeof READING_WIDTHS)[number]["id"];

export type Appearance = {
  theme: ThemeMode;
  themeColor: ThemeColorId;
  accentColor: AccentColorId;
  uiFont: UiFontId;
  fontSize: number;
  quranFont: ArabicFontId;
  arabicFont: ArabicFontId;
  urduFont: UrduFontId;
  lineSpacing: number;
  readingWidth: ReadingWidthId;
  rounded: number;
  animation: AnimationLevel;
  glass: boolean;
  compact: boolean;
};

const find = <T extends { id: string }>(list: readonly T[], id: string, fallback: T): T =>
  list.find((x) => x.id === id) ?? fallback;

/** Themes that use a light foreground/background pairing. */
export const LIGHT_THEMES: ThemeMode[] = ["light", "sepia", "desert", "rose-dusk"];

export type ResolvedTheme = Exclude<ThemeMode, "auto">;

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Writes every appearance choice onto <html> as variables + data attributes. */
export function applyAppearance(a: Appearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = resolveTheme(a.theme);

  root.classList.toggle("dark", !LIGHT_THEMES.includes(resolved));
  root.dataset["theme"] = resolved;
  root.dataset["animation"] = a.animation;
  root.dataset["glass"] = a.glass ? "on" : "off";
  root.dataset["density"] = a.compact ? "compact" : "cozy";

  const color = find(THEME_COLORS, a.themeColor, THEME_COLORS[0]);
  const accent = find(ACCENT_COLORS, a.accentColor, ACCENT_COLORS[0]);
  const ui = find(UI_FONTS, a.uiFont, UI_FONTS[0]);
  const quran = find(ARABIC_FONTS, a.quranFont, ARABIC_FONTS[0]);
  const arabic = find(ARABIC_FONTS, a.arabicFont, ARABIC_FONTS[0]);
  const urdu = find(URDU_FONTS, a.urduFont, URDU_FONTS[0]);
  const width = find(READING_WIDTHS, a.readingWidth, READING_WIDTHS[1]);

  root.style.setProperty("--brand-primary", color.primary);
  root.style.setProperty("--brand-ring", color.ring);
  root.style.setProperty("--brand-accent", accent.accent);
  root.style.setProperty("--font-ui", ui.stack);
  root.style.setProperty("--font-quran", quran.stack);
  root.style.setProperty("--font-arabic-user", arabic.stack);
  root.style.setProperty("--font-urdu-user", urdu.stack);
  root.style.setProperty("--app-font-size", `${a.fontSize}px`);
  root.style.setProperty("--reading-line", String(a.lineSpacing));
  root.style.setProperty("--reading-width", width.value);
  root.style.setProperty("--radius", `${a.rounded}rem`);
}
