import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/AppShell";
import { fetchQibla } from "@/lib/quran-api";

export const Route = createFileRoute("/qibla")({
  head: () => ({
    meta: [
      { title: "Qibla Direction — Live Compass | Raah e Hidayath" },
      { name: "description", content: "Find the exact direction of the Ka'bah from your current location with a live animated compass." },
      { property: "og:title", content: "Qibla Direction | Raah e Hidayath" },
      { property: "og:description", content: "Live Qibla compass from your location." },
    ],
  }),
  component: Qibla,
});

function Qibla() {
  const [dir, setDir] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [status, setStatus] = useState("Requesting your location…");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("Location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const d = await fetchQibla(pos.coords.latitude, pos.coords.longitude);
          setDir(d);
          setStatus(`${d.toFixed(2)}° from true north`);
        } catch {
          setStatus("Couldn't calculate the Qibla. Please retry.");
        }
      },
      () => setStatus("Location permission denied — allow location to find the Qibla."),
    );
  }, []);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : 0);
      setHeading(h);
    };
    window.addEventListener("deviceorientation", handler as EventListener);
    return () => window.removeEventListener("deviceorientation", handler as EventListener);
  }, []);

  const rotation = (dir ?? 0) - heading;

  return (
    <div className="space-y-6">
      <SectionTitle title="Qibla Direction" subtitle="Point your device flat and turn until the arrow reaches the Ka'bah" />
      <Card className="flex flex-col items-center gap-6 py-10">
        <div className="relative grid size-64 place-items-center rounded-full border border-border gradient-soft shadow-glow">
          <span className="absolute inset-4 rounded-full border border-dashed border-primary/30 animate-spin-slow" />
          <span className="absolute top-3 text-xs font-semibold text-muted-foreground">N</span>
          <span className="absolute bottom-3 text-xs text-muted-foreground">S</span>
          <span className="absolute left-3 text-xs text-muted-foreground">W</span>
          <span className="absolute right-3 text-xs text-muted-foreground">E</span>
          <div className="transition-transform duration-500" style={{ transform: `rotate(${rotation}deg)` }}>
            <svg viewBox="0 0 60 120" className="size-40 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M30 8 L42 44 L30 36 L18 44 Z" fill="currentColor" />
              <rect x="22" y="76" width="16" height="14" className="text-accent" fill="currentColor" stroke="none" />
              <line x1="30" y1="44" x2="30" y2="76" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{status}</p>
      </Card>
    </div>
  );
}