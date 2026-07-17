"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertTriangleIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"initial" | "otp">("initial");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code");
      setStep("otp");
      setMessage("Verification code sent! Check your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !otp) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email, password, otp }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Could not register."
      );
      return;
    }
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <div className="anim-fade-up">
      <div className="mb-8 flex items-center gap-3 md:hidden">
        <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center shadow-[var(--shadow-glow)]">
          <SparklesIcon className="h-5 w-5 text-white" />
        </div>
        <div className="text-xl font-extrabold gradient-text">Finnova</div>
      </div>

      <h1 className="text-4xl font-black tracking-tight gradient-text">
        Create account
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Start tracking your finances in minutes. No card required.
      </p>

      {message ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary anim-scale-in">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      {step === "initial" ? (
        <form onSubmit={requestOtp} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground">
              Name <span className="text-muted-foreground">(optional)</span>
            </span>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <UserGlyph />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground">Email</span>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <EmailGlyph />
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground">Password</span>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <LockGlyph />
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </span>
          </label>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              <AlertTriangleIcon className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full justify-center"
          >
            {loading ? "Sending Code…" : "Send Verification Code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onRegisterSubmit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground">Verification Code</span>
            <p className="text-xs text-muted-foreground">Sent to {email}</p>
            <input 
              type="text" 
              required 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              placeholder="123456" 
              maxLength={6} 
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" 
            />
          </label>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              <AlertTriangleIcon className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center">Create Account</Button>
          <button type="button" onClick={() => { setStep("initial"); setOtp(""); setMessage(null); }} className="mt-2 text-sm text-muted-foreground hover:text-foreground hover:underline">Change email or password</button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function EmailGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
