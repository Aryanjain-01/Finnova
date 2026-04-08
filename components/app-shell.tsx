"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen text-zinc-900 dark:text-zinc-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-emerald-200/70 bg-white/85 px-5 py-7 backdrop-blur-md dark:border-emerald-950/60 dark:bg-emerald-950/25 md:flex">
        <div className="mb-8 px-2">
          <Link href="/dashboard" className="text-lg font-extrabold tracking-tight text-emerald-900 dark:text-emerald-200">
            Finance Tracker
          </Link>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">Your money, organized.</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-700/30"
                    : "text-zinc-700 hover:bg-emerald-50 dark:text-zinc-200 dark:hover:bg-emerald-900/30"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 rounded-xl border border-emerald-200 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-white dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-zinc-200 dark:hover:bg-emerald-950/70"
        >
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-200/80 bg-white/85 px-4 py-3 backdrop-blur-md md:hidden dark:border-emerald-950/60 dark:bg-emerald-950/25">
          <Link href="/dashboard" className="font-bold tracking-tight text-emerald-900 dark:text-emerald-200">
            Finance Tracker
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Sign out
          </button>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-emerald-200/80 bg-white/70 px-2 py-2 backdrop-blur-md md:hidden dark:border-emerald-950/60 dark:bg-emerald-950/20">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-700/30"
                    : "bg-emerald-50 text-zinc-700 dark:bg-emerald-900/30 dark:text-zinc-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
