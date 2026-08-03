import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, HelpCircle, ImageIcon, Info, Loader2, ScanBarcode, StopCircle, X } from "lucide-react";
import { Card, SectionTitle } from "@/components/AppShell";
import { analyseBarcode, type ScanResult } from "@/lib/extra-data";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Barcode Scanner — Check Product Origin | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Scan or type a product barcode to see the country that registered it, including Israeli (729) registrations. Works on iPhone, Android and desktop browsers.",
      },
      { property: "og:title", content: "Product Barcode Origin Scanner | Raah e Hidayath" },
      { property: "og:description", content: "Find out which country registered a product barcode before you buy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scanner,
});

const HISTORY_KEY = "reh-scan-history";
const READER_ID = "reh-qr-reader";

/* ---- html5-qrcode via CDN --------------------------------------------------
 * Accurate on every browser (iOS Safari, Android Chrome, desktop). Loaded at
 * runtime only; prioritises EAN-13 / UPC-A for exact product barcodes. */
type Html5QrcodeInstance = {
  start(
    cameraConfig: MediaTrackConstraints | { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number }; aspectRatio?: number; disableFlip?: boolean },
    onSuccess: (decodedText: string) => void,
    onFailure: (errorMessage: string) => void,
  ): Promise<void>;
  stop(): Promise<void>;
  clear(): void;
  scanFile(imageFile: File, showImage?: boolean): Promise<string>;
};

type Html5QrcodeStatic = new (
  elementId: string,
  config: { formatsToSupport: number[]; verbose: boolean; useBarCodeDetectorIfSupported?: boolean },
) => Html5QrcodeInstance;

type Html5QrcodeWindow = {
  Html5Qrcode?: Html5QrcodeStatic;
  Html5QrcodeSupportedFormats?: Record<string, number>;
};

const HTML5_QRCODE_URL = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

let libPromise: Promise<{ Ctor: Html5QrcodeStatic; formats: Record<string, number> }> | null = null;
function loadHtml5Qrcode() {
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const w = window as unknown as Html5QrcodeWindow;
      if (w.Html5Qrcode && w.Html5QrcodeSupportedFormats) {
        resolve({ Ctor: w.Html5Qrcode, formats: w.Html5QrcodeSupportedFormats });
        return;
      }
      const script = document.createElement("script");
      script.src = HTML5_QRCODE_URL;
      script.async = true;
      script.onload = () => {
        if (w.Html5Qrcode && w.Html5QrcodeSupportedFormats) {
          resolve({ Ctor: w.Html5Qrcode, formats: w.Html5QrcodeSupportedFormats });
        } else {
          reject(new Error("html5-qrcode did not initialise"));
        }
      };
      script.onerror = () => reject(new Error("Could not download the scanner library"));
      document.head.appendChild(script);
    });
    libPromise.catch(() => {
      libPromise = null; /* allow retry after a network failure */
    });
  }
  return libPromise;
}

/* Native BarcodeDetector pass — fastest and most accurate where available. */
async function detectNative(file: File): Promise<string> {
  const w = window as unknown as {
    BarcodeDetector?: new (o?: { formats?: string[] }) => {
      detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
  };
  if (!w.BarcodeDetector) return "";
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return "";
  try {
    const det = new w.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar"],
    });
    const found = await det.detect(bitmap);
    return found[0]?.rawValue ?? "";
  } catch {
    return "";
  }
}

/* Upscales / sharpens / rotates a photo so faint, small or sideways barcodes
 * still decode. Returns several progressively processed versions. */
async function photoVariants(file: File): Promise<File[]> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return [file];

  const make = (scale: number, contrast: number, grayscale: boolean, rotate = 0): File | null => {
    const w = Math.min(2400, Math.round(bitmap.width * scale));
    const h = Math.round((w / bitmap.width) * bitmap.height);
    const swap = rotate === 90 || rotate === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotate) ctx.rotate((rotate * Math.PI) / 180);
    ctx.filter = `${grayscale ? "grayscale(1) " : ""}contrast(${contrast})`;
    ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
    const url = canvas.toDataURL("image/png");
    const bin = atob(url.split(",")[1] ?? "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], "barcode.png", { type: "image/png" });
  };

  const targetScale = bitmap.width < 1000 ? 2.2 : 1;
  return [
    file,
    make(targetScale, 1, false),
    make(targetScale, 1.6, true),
    make(Math.max(targetScale, 1.6), 2.2, true),
    make(targetScale, 1.6, true, 90),
    make(targetScale, 1.6, true, 270),
    make(targetScale, 1.6, true, 180),
  ].filter((f): f is File => Boolean(f));
}


function Scanner() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [decodingFile, setDecodingFile] = useState(false);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [hardwareZoom, setHardwareZoom] = useState(false);

  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as ScanResult[]);
    } catch {
      /* ignore */
    }
  }, []);

  const remember = useCallback((r: ScanResult) => {
    setHistory((prev) => {
      const next = [r, ...prev.filter((h) => h.code !== r.code)].slice(0, 12);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const check = useCallback(
    (value: string) => {
      const r = analyseBarcode(value);
      if (!r) {
        setResult(null);
        setError("Enter a valid barcode of at least 8 digits (EAN-8, UPC-A or EAN-13).");
        return;
      }
      setError("");
      setResult(r);
      remember(r);
    },
    [remember],
  );

  const stopCamera = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    trackRef.current = null;
    setScanning(false);
    setStarting(false);
    setZoomRange(null);
    setHardwareZoom(false);
    setZoom(1);
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        /* already stopped */
      }
      try {
        scanner.clear();
      } catch {
        /* ignore */
      }
    }
    stoppingRef.current = false;
  }, []);

  useEffect(
    () => () => {
      void stopCamera();
    },
    [stopCamera],
  );

  /* Hardware zoom where the camera supports it, CSS zoom everywhere else. */
  const applyZoom = useCallback((value: number) => {
    setZoom(value);
    const track = trackRef.current as (MediaStreamTrack & { getCapabilities?: () => { zoom?: unknown } }) | null;
    if (!track?.getCapabilities) return;
    const caps = track.getCapabilities() as { zoom?: { min: number; max: number } };
    if (!caps.zoom) return;
    void track
      .applyConstraints({ advanced: [{ zoom: value }] } as unknown as MediaTrackConstraints)
      .catch(() => undefined);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");

    /* iOS Safari & Chrome block camera access without HTTPS. */
    if (!window.isSecureContext) {
      setCameraError(
        "The camera is blocked because this page is not on a secure HTTPS connection. Open the app through its https:// link, then allow camera access — or use a gallery photo below.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not allow camera access. Use the gallery photo option below instead.");
      return;
    }

    setStarting(true);
    setScanning(true); /* mount the reader element before the library attaches */

    /* Let React render the reader div first. */
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      const { Ctor, formats } = await loadHtml5Qrcode();
      const wanted = [formats["EAN_13"], formats["UPC_A"], formats["EAN_8"], formats["UPC_E"], formats["CODE_128"]].filter(
        (f): f is number => typeof f === "number",
      );
      const scanner = new Ctor(READER_ID, {
        formatsToSupport: wanted,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          /* continuous autofocus keeps small print sharp */
          ...({ focusMode: "continuous", advanced: [{ focusMode: "continuous" }] } as object),
        } as MediaTrackConstraints,
        { fps: 20, qrbox: { width: 300, height: 180 }, aspectRatio: 1.777, disableFlip: false },
        (decodedText) => {
          setInput(decodedText);
          check(decodedText);
          void stopCamera();
        },
        () => {
          /* per-frame decode failure — normal while aiming */
        },
      );

      /* iOS Safari: without playsinline the feed is forced fullscreen or blocked. */
      const video = document.querySelector<HTMLVideoElement>(`#${READER_ID} video`);
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.muted = true;
        const track = (video.srcObject as MediaStream | null)?.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        const caps = track?.getCapabilities?.() as { zoom?: { min: number; max: number; step?: number } } | undefined;
        const zoomCap = caps?.zoom;
        if (zoomCap) {
          setHardwareZoom(true);
          setZoomRange({ min: zoomCap.min || 1, max: zoomCap.max, step: zoomCap.step || 0.1 });
          setZoom(zoomCap.min || 1);
        } else {
          setHardwareZoom(false);
          setZoomRange({ min: 1, max: 4, step: 0.1 });
          setZoom(1);
        }
      }
      setStarting(false);
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError(
          "Camera permission was denied. Tap the lock/AA icon in your browser address bar, allow the camera for this site, then try again — or use a gallery photo below.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No usable back camera was found on this device. Try the gallery photo option below.");
      } else {
        setCameraError(
          "Could not start the camera here. Allow camera permission, make sure you are on the https:// link, or use a gallery photo below.",
        );
      }
      await stopCamera();
    }
  }, [check, stopCamera]);

  /* ---- Gallery upload: photograph of the barcode, decoded locally ---- */
  const readPhoto = useCallback(
    async (file: File | null) => {
      if (!file) return;
      await stopCamera();
      setDecodingFile(true);
      setCameraError("");
      try {
        let text = await detectNative(file);
        const { Ctor, formats } = await loadHtml5Qrcode();
        const wanted = [formats["EAN_13"], formats["UPC_A"], formats["EAN_8"], formats["UPC_E"], formats["CODE_128"]].filter(
          (f): f is number => typeof f === "number",
        );
        const variants = text ? [] : await photoVariants(file);

        for (const candidate of variants) {
          const scanner = new Ctor(READER_ID, {
            formatsToSupport: wanted,
            verbose: false,
            useBarCodeDetectorIfSupported: true,
          });
          try {
            text = await scanner.scanFile(candidate, false);
          } catch {
            /* try the next, more processed version of the photo */
          }
          try {
            scanner.clear();
          } catch {
            /* ignore */
          }
          if (text) break;
        }
        if (!text) throw new Error("no barcode");
        setInput(text);
        check(text);
      } catch {
        setCameraError(
          "No barcode could be read in that photo. Crop close to the bars, keep them straight and well lit — or type the digits printed under the bars.",
        );
      } finally {
        setDecodingFile(false);
      }
    },
    [check, stopCamera],
  );


  return (
    <div className="space-y-6">
      <SectionTitle
        title="Product Barcode Scanner"
        subtitle="Check which country registered a product — including Israeli (729) barcodes"
      />

      <Card className="space-y-4">
        <h2 className="sr-only">Scan a barcode</h2>

        <div className="flex flex-wrap gap-2">
          {!scanning ? (
            <button
              onClick={() => void startCamera()}
              disabled={starting}
              className="inline-flex min-h-11 items-center gap-2 rounded-full gradient-hero px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Camera className="size-4" aria-hidden /> Scan with camera
            </button>
          ) : (
            <button
              onClick={() => void stopCamera()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
            >
              <StopCircle className="size-4" aria-hidden /> Stop camera
            </button>
          )}

          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:text-primary focus-within:ring-2 focus-within:ring-primary">
            {decodingFile ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImageIcon className="size-4" aria-hidden />}
            {decodingFile ? "Reading photo…" : "Upload barcode photo"}
            <input
              type="file"
              accept="image/*"
              
              className="sr-only"
              onChange={(e) => {
                void readPhoto(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void readPhoto(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm transition hover:border-primary hover:text-primary"
        >
          <ImageIcon className="size-5" aria-hidden />
          <span className="font-semibold">{decodingFile ? "Reading your image…" : "Upload or drop a barcode image"}</span>
          <span className="text-xs text-muted-foreground">
            Any photo, screenshot or gallery image — it is read on your device and scanned instantly.
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void readPhoto(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </label>


        {cameraError && (
          <p role="status" className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {cameraError}
          </p>
        )}

        {/* The html5-qrcode library renders its <video playsinline autoplay muted> feed inside this box */}
        <div className={scanning ? "space-y-3" : "hidden"}>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
            <div
              id={READER_ID}
              className="w-full origin-center transition-transform duration-150 [&_img]:hidden [&_video]:h-72 [&_video]:w-full [&_video]:object-cover"
              style={{ transform: hardwareZoom ? undefined : `scale(${zoom})` }}
            />
            {starting && (
              <p className="absolute inset-0 grid place-items-center bg-black/60 text-sm text-primary-foreground">
                <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden /> Starting the HD camera…
              </p>
            )}
            <span aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-accent shadow-glow" />
          </div>

          {zoomRange && (
            <label className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="shrink-0 font-medium">Zoom {zoom.toFixed(1)}×</span>
              <input
                type="range"
                min={zoomRange.min}
                max={zoomRange.max}
                step={zoomRange.step}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value))}
                className="h-11 w-full accent-[hsl(var(--primary))]"
                aria-label="Camera zoom"
              />
            </label>
          )}
        </div>


        <form
          onSubmit={(e) => {
            e.preventDefault();
            check(input);
          }}
          className="space-y-2"
        >
          <label htmlFor="barcode-input" className="block text-sm font-medium">
            Or type the barcode number
          </label>
          <div className="flex gap-2">
            <input
              id="barcode-input"
              value={input}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 7290000066318"
              aria-describedby="barcode-help"
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl gradient-hero px-4 text-sm font-semibold text-primary-foreground"
            >
              <ScanBarcode className="size-4" aria-hidden /> Check
            </button>
          </div>
          <p id="barcode-help" className="text-xs text-muted-foreground">
            Works with EAN-13, UPC-A and EAN-8 numbers printed under the bars.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </Card>

      <div aria-live="polite">{result && <ResultCard result={result} />}</div>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg">
          <HelpCircle className="size-4 text-primary" aria-hidden /> How to read the result
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• The first three digits of a barcode are the GS1 prefix of the country where the company registered the product.</li>
          <li>• <strong className="text-foreground">729</strong> is GS1 Israel.</li>
          <li>• A prefix shows the registering company's country — it does not always match where the item was manufactured, and a multinational may register locally.</li>
          <li>• Use the result as a first check, then confirm with the label or the manufacturer.</li>
        </ul>
      </Card>

      {history.length > 0 && (
        <section aria-labelledby="scan-history" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="scan-history" className="font-display text-xl">
              Recent checks
            </h2>
            <button
              onClick={() => {
                setHistory([]);
                try {
                  localStorage.removeItem(HISTORY_KEY);
                } catch {
                  /* ignore */
                }
              }}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-sm text-muted-foreground hover:text-primary"
            >
              <X className="size-4" aria-hidden /> Clear
            </button>
          </div>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.code}>
                <Card className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm">{h.code}</span>
                    <span className="block truncate text-xs text-muted-foreground">{h.country}</span>
                  </span>
                  <VerdictPill verdict={h.verdict} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: ScanResult["verdict"] }) {
  const map = {
    israeli: { text: "Israeli (729)", cls: "bg-destructive/15 text-destructive" },
    flagged: { text: "Check further", cls: "bg-accent/20 text-accent-foreground" },
    clear: { text: "Not Israeli", cls: "bg-primary/15 text-primary" },
    unknown: { text: "Unknown", cls: "bg-secondary text-muted-foreground" },
  } as const;
  const v = map[verdict];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${v.cls}`}>{v.text}</span>;
}

function ResultCard({ result }: { result: ScanResult }) {
  const is729 = result.code.startsWith("729");
  const Icon = is729 ? AlertTriangle : CheckCircle2;
  return (
    <Card className={`space-y-3 ${is729 ? "border-destructive/60" : "border-primary/50"}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-7 shrink-0 ${is729 ? "text-destructive" : "text-primary"}`} aria-hidden />
        <div className="min-w-0">
          <p className={`font-display text-xl ${is729 ? "text-destructive" : "text-primary"}`}>
            {is729 ? "Prefix 729 Detected" : "Standard Product Detected"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
        </div>
        <VerdictPill verdict={result.verdict} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Barcode</dt>
          <dd className="font-mono">{result.code}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">GS1 prefix</dt>
          <dd className="font-mono">{result.prefix}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Registered country</dt>
          <dd>{result.country}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Checksum</dt>
          <dd>{result.validChecksum === null ? "Not applicable" : result.validChecksum ? "Valid ✓" : "Invalid ✗"}</dd>
        </div>
      </dl>

      {result.brandNote && <p className="text-sm text-muted-foreground">{result.brandNote}</p>}
    </Card>
  );
}
