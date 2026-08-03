import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw, Scale } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/zakat")({
  head: () => ({
    meta: [
      { title: "Zakat Calculator — Every Currency, Gold, Silver & Assets | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Calculate your zakat on cash, gold, silver, investments and business stock in any currency, with live metal prices and the correct nisab threshold.",
      },
      { property: "og:title", content: "Zakat Calculator | Raah e Hidayath" },
      { property: "og:description", content: "Accurate zakat on everything you own, in your currency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Zakat,
});

const CURRENCIES = [
  ["INR", "₹", "Indian Rupee"],
  ["PKR", "₨", "Pakistani Rupee"],
  ["USD", "$", "US Dollar"],
  ["EUR", "€", "Euro"],
  ["GBP", "£", "British Pound"],
  ["AED", "د.إ", "UAE Dirham"],
  ["SAR", "﷼", "Saudi Riyal"],
  ["QAR", "﷼", "Qatari Riyal"],
  ["KWD", "د.ك", "Kuwaiti Dinar"],
  ["BHD", "BD", "Bahraini Dinar"],
  ["OMR", "﷼", "Omani Rial"],
  ["TRY", "₺", "Turkish Lira"],
  ["MYR", "RM", "Malaysian Ringgit"],
  ["IDR", "Rp", "Indonesian Rupiah"],
  ["BDT", "৳", "Bangladeshi Taka"],
  ["EGP", "E£", "Egyptian Pound"],
  ["NGN", "₦", "Nigerian Naira"],
  ["ZAR", "R", "South African Rand"],
  ["CAD", "$", "Canadian Dollar"],
  ["AUD", "$", "Australian Dollar"],
  ["JPY", "¥", "Japanese Yen"],
  ["CNY", "¥", "Chinese Yuan"],
  ["AFN", "؋", "Afghan Afghani"],
  ["IQD", "ع.د", "Iraqi Dinar"],
  ["JOD", "JD", "Jordanian Dinar"],
  ["LBP", "ل.ل", "Lebanese Pound"],
  ["MAD", "DH", "Moroccan Dirham"],
  ["SDG", "£", "Sudanese Pound"],
  ["SYP", "£", "Syrian Pound"],
  ["YER", "﷼", "Yemeni Rial"],
  ["RUB", "₽", "Russian Ruble"],
  ["PHP", "₱", "Philippine Peso"],
  ["LKR", "Rs", "Sri Lankan Rupee"],
  ["NPR", "Rs", "Nepalese Rupee"],
] as const;

const GOLD_NISAB_G = 87.48;
const SILVER_NISAB_G = 612.36;
const OZ_TO_G = 31.1035;

const FIELDS = [
  { key: "cash", en: "Cash in hand", ur: "نقد رقم (ہاتھ میں)" },
  { key: "bank", en: "Bank balance & savings", ur: "بینک بیلنس اور بچت" },
  { key: "gold", en: "Gold you own (grams)", ur: "سونا (گرام میں)" },
  { key: "silver", en: "Silver you own (grams)", ur: "چاندی (گرام میں)" },
  { key: "invest", en: "Shares, funds & investments", ur: "شیئرز اور سرمایہ کاری" },
  { key: "business", en: "Business stock / inventory", ur: "کاروباری مال و اسٹاک" },
  { key: "owed", en: "Money people owe you", ur: "وہ رقم جو دوسروں پر واجب ہے" },
] as const;
const DEBT_FIELD = { key: "debt", en: "Minus: debts you must repay now", ur: "منفی: قرضے جو ابھی ادا کرنے ہیں" };

function Zakat() {
  const { settings } = useSettings();
  const urdu = settings.lang === "ur";

  const [currency, setCurrency] = useState("INR");
  const [values, setValues] = useState<Record<string, string>>({});
  const [goldPrice, setGoldPrice] = useState(""); /* per gram, in selected currency */
  const [silverPrice, setSilverPrice] = useState("");
  const [priceStatus, setPriceStatus] = useState("");
  const [fetching, setFetching] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const symbol = CURRENCIES.find(([c]) => c === currency)?.[1] ?? currency;
  const num = (s: string | undefined) => {
    const n = parseFloat(s ?? "");
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const fetchPrices = async () => {
    setFetching(true);
    setPriceStatus("");
    try {
      const [goldRes, silverRes, fxRes] = await Promise.all([
        fetch("https://api.gold-api.com/price/XAU").then((r) => r.json()) as Promise<{ price?: number }>,
        fetch("https://api.gold-api.com/price/XAG").then((r) => r.json()) as Promise<{ price?: number }>,
        currency === "USD"
          ? Promise.resolve({ rates: { USD: 1 } })
          : (fetch(`https://open.er-api.com/v6/latest/USD`).then((r) => r.json()) as Promise<{ rates?: Record<string, number> }>),
      ]);
      const rate = currency === "USD" ? 1 : (fxRes as { rates?: Record<string, number> }).rates?.[currency];
      if (!goldRes.price || !silverRes.price || !rate) throw new Error("missing");
      setGoldPrice(((goldRes.price / OZ_TO_G) * rate).toFixed(2));
      setSilverPrice(((silverRes.price / OZ_TO_G) * rate).toFixed(2));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setUpdatedAt(time);
      setPriceStatus(
        urdu
          ? `تازہ لائیو مارکیٹ ریٹس (${time}) — مقامی ریٹ مختلف ہو تو خود بدل دیں۔`
          : `Live market rates loaded at ${time} — edit them if your local rate differs.`,
      );
    } catch {
      setPriceStatus(
        urdu
          ? "لائیو قیمتیں نہیں مل سکیں — براہ کرم اپنی مقامی قیمت فی گرام خود لکھیں۔"
          : "Could not fetch live prices — please type your local price per gram.",
      );
    } finally {
      setFetching(false);
    }
  };

  /* Live gold, silver and currency rates load automatically — on first open
   * and every time the currency changes — so the nisab is always current. */
  useEffect(() => {
    setGoldPrice("");
    setSilverPrice("");
    setUpdatedAt("");
    setPriceStatus("");
    void fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const result = useMemo(() => {
    const gp = num(goldPrice);
    const sp = num(silverPrice);
    const goldValue = num(values["gold"]) * gp;
    const silverValue = num(values["silver"]) * sp;
    const money =
      num(values["cash"]) + num(values["bank"]) + num(values["invest"]) + num(values["business"]) + num(values["owed"]) + goldValue + silverValue;
    const total = Math.max(0, money - num(values["debt"]));
    const goldNisab = gp ? GOLD_NISAB_G * gp : 0;
    const silverNisab = sp ? SILVER_NISAB_G * sp : 0;
    const nisabs = [goldNisab, silverNisab].filter((n) => n > 0);
    const nisab = nisabs.length ? Math.min(...nisabs) : 0;
    const eligible = nisab > 0 && total >= nisab;
    return { total, nisab, eligible, zakat: eligible ? total * 0.025 : 0 };
  }, [values, goldPrice, silverPrice]);

  const fmt = (n: number) =>
    `${symbol} ${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <SectionTitle
        title={urdu ? "زکوٰۃ کیلکولیٹر" : "Zakat Calculator"}
        subtitle={
          urdu
            ? "نقدی، سونا، چاندی، سرمایہ کاری اور کاروبار — ہر کرنسی میں صحیح حساب"
            : "Cash, gold, silver, investments and business — accurate in every currency"
        }
      />

      <Card className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">{urdu ? "کرنسی" : "Currency"}</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card px-3"
          >
            {CURRENCIES.map(([code, sym, name]) => (
              <option key={code} value={code}>
                {code} — {name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          {urdu
            ? "زکوٰۃ اس مال پر ہے جو ایک قمری سال آپ کے پاس رہا۔"
            : "Zakat is due on wealth that stayed with you for one lunar year."}
        </p>
      </Card>

      {/* Metal prices */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Coins className="size-5 text-primary" aria-hidden /> {urdu ? "سونے چاندی کی قیمت (فی گرام)" : "Metal prices (per gram)"}
          </h2>
          <button
            onClick={() => void fetchPrices()}
            disabled={fetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${fetching ? "animate-spin" : ""}`} aria-hidden />
            {urdu ? "لائیو ریٹس تازہ کریں" : "Refresh live rates"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{urdu ? `سونا (${symbol}/گرام)` : `Gold (${symbol}/gram)`}</span>
            <input
              inputMode="decimal"
              value={goldPrice}
              onChange={(e) => setGoldPrice(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{urdu ? `چاندی (${symbol}/گرام)` : `Silver (${symbol}/gram)`}</span>
            <input
              inputMode="decimal"
              value={silverPrice}
              onChange={(e) => setSilverPrice(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
        </div>
        {priceStatus && (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {priceStatus}
          </p>
        )}
      </Card>

      {/* Assets */}
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Scale className="size-5 text-primary" aria-hidden /> {urdu ? "آپ کا مال" : "Your wealth"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(({ key, en, ur }) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block text-muted-foreground">{urdu ? ur : en}</span>
              <input
                inputMode="decimal"
                value={values[key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value.replace(/[^\d.]/g, "") }))}
                placeholder={key === "gold" || key === "silver" ? "grams" : symbol}
                className="min-h-11 w-full rounded-xl border border-border bg-card px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
          ))}
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted-foreground">{urdu ? DEBT_FIELD.ur : DEBT_FIELD.en}</span>
            <input
              inputMode="decimal"
              value={values["debt"] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, debt: e.target.value.replace(/[^\d.]/g, "") }))}
              placeholder={symbol}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
        </div>
      </Card>

      {/* Result */}
      <Card className="gradient-hero space-y-2 text-primary-foreground">
        <div className="flex justify-between text-sm">
          <span>{urdu ? "کل قابلِ زکوٰۃ مال" : "Total zakatable wealth"}</span>
          <span className="font-semibold tabular-nums">{fmt(result.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{urdu ? "نصاب (کم از کم حد)" : "Nisab threshold"}</span>
          <span className="font-semibold tabular-nums">{result.nisab ? fmt(result.nisab) : "—"}</span>
        </div>
        <div className="border-t border-white/20 pt-3 text-center">
          {!result.nisab ? (
            <p className="text-sm">{urdu ? "نصاب جاننے کے لیے سونے یا چاندی کی قیمت لکھیں۔" : "Enter a gold or silver price to know the nisab."}</p>
          ) : result.eligible ? (
            <>
              <p className="text-xs uppercase tracking-[0.28em] text-primary-foreground/80">
                {urdu ? "آپ پر زکوٰۃ فرض ہے — واجب رقم" : "Zakat is due on you — payable amount"}
              </p>
              <p className="mt-1 font-display text-4xl tabular-nums text-accent">{fmt(result.zakat)}</p>
              <p className="mt-1 text-xs text-primary-foreground/80">{urdu ? "اپنے کل مال کا ۲.۵٪" : "2.5% of your total wealth"}</p>
            </>
          ) : (
            <p className="text-sm">
              {urdu
                ? "آپ کا مال نصاب سے کم ہے — اس سال زکوٰۃ واجب نہیں، صدقہ جاری رکھیں۔"
                : "Your wealth is below the nisab — no zakat due this year, but sadaqah is always open."}
            </p>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        {urdu
          ? "نوٹ: زیور جو روزانہ پہنا جاتا ہے اس میں علماء کا اختلاف ہے؛ احتیاط اسی میں ہے کہ اسے شامل کیا جائے۔ کسی فقہی سوال پر مقامی عالم سے رجوع کریں۔"
          : "Note: scholars differ on jewellery worn daily; including it is the safer opinion. For fiqh questions, ask a local scholar."}
      </p>
    </div>
  );
}
