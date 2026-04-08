"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
} from "@/components/ui/icons";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.code === "database_unavailable"
          ? "Can't connect to the database. Start PostgreSQL or check DATABASE_URL in .env."
          : "Invalid email or password."
      );
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="anim-fade-up">
      {/* Mobile-only brand mark (the split-screen hides the left hero on md-) */}
      <div className="mb-8 flex items-center gap-3 md:hidden">
        <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center shadow-[var(--shadow-glow)]">
          <SparklesIcon className="h-5 w-5 text-white" />
        </div>
        <div className="text-xl font-extrabold gradient-text">Finnova</div>
      </div>

      <h1 className="text-4xl font-black tracking-tight gradient-text">
        Welcome back
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Sign in to pick up where you left off.
      </p>

      {registered ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success anim-scale-in"
        >
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Account created</div>
            <div className="text-xs text-success/80">
              You can sign in with your new credentials now.
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
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
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Password</span>
          </div>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <LockGlyph />
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface pl-11 pr-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
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
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

function EmailGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
