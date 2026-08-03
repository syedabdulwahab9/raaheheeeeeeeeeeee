import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Card } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Family Connect | Raah e Hidayath" },
      {
        name: "description",
        content:
          "Sign in or create your Raah e Hidayath account to use Family Connect and encourage your family in worship.",
      },
      { property: "og:title", content: "Sign in | Raah e Hidayath" },
      { property: "og:description", content: "Sign in to connect with your family in worship." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : "/family",
  }),
  component: AuthPage,
});

function safePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/family";
}

const NEXT_KEY = "reh-auth-next";

function AuthPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  // Destination survives a full-page OAuth round trip.
  const destination = (() => {
    if (typeof window === "undefined") return safePath(next);
    const stored = window.sessionStorage.getItem(NEXT_KEY);
    return safePath(next !== "/family" ? next : (stored ?? next));
  })();

  useEffect(() => {
    if (loading || !user) return;
    if (typeof window !== "undefined") window.sessionStorage.removeItem(NEXT_KEY);
    void navigate({ to: destination, replace: true });
  }, [user, loading, destination, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setNeedsConfirm(false);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(destination)}`,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (data.session) {
          // signed in immediately — the effect above handles the redirect
        } else {
          setNeedsConfirm(true);
          setMessage("Account created. Check your inbox and click the confirmation link to finish.");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // Session is now stored; onAuthStateChange drives the redirect.
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (/email not confirmed|not confirmed/i.test(msg)) {
        setNeedsConfirm(true);
        setError(
          "This email hasn't been confirmed yet. Open the confirmation link we emailed you, or resend it below.",
        );
      } else if (/invalid login credentials/i.test(msg)) {
        setError("Email or password is incorrect.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email) {
      setError("Enter your email first, then resend.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(destination)}`,
        },
      });
      if (err) throw err;
      setMessage("Confirmation email sent. Open the link on this device to finish signing in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the email.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-label="Restoring your session" />
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl gradient-hero text-primary-foreground shadow-glow">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is only used for Family Connect. Nothing is shared until you allow it.
        </p>
      </div>

      <Card className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Ahmed"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              <Mail className="mr-1 inline size-3" /> {message}
            </p>
          )}
          {needsConfirm && (
            <button
              type="button"
              onClick={() => void resendConfirmation()}
              disabled={busy}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-xs font-semibold transition hover:bg-accent/10 disabled:opacity-60"
            >
              Resend confirmation email
            </button>
          )}


          <button
            type="submit"
            disabled={busy || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl gradient-hero px-4 py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
