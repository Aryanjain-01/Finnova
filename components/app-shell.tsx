"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import {
  HomeIcon,
  ListIcon,
  WalletIcon,
  PiggyBankIcon,
  TargetIcon,
  RepeatIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  LogoutIcon,
  SparklesIcon,
} from "@/components/ui/icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/transactions", label: "Transactions", icon: ListIcon },
  { href: "/budgets", label: "Budgets", icon: WalletIcon },
  { href: "/accounts", label: "Accounts", icon: PiggyBankIcon },
  { href: "/goals", label: "Goals", icon: TargetIcon },
  { href: "/recurring", label: "Recurring", icon: RepeatIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Cmd/Ctrl+K toggles palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleQuickAdd = () => {
    window.dispatchEvent(new Event("finnova:quick-add"));
  };

  const navContent = (
    <>
      <div className="mb-8 px-2 anim-fade-up">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center shadow-[var(--shadow-glow)]">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold gradient-text leading-none">
              Finnova
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Your money, clarified
            </div>
          </div>
        </Link>
      </div>

      <Button
        variant="primary"
        size="md"
        className="mb-4 w-full justify-center"
        leftIcon={<PlusIcon className="h-4 w-4" />}
        onClick={handleQuickAdd}
      >
        Quick add
      </Button>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="mb-6 flex w-full items-center gap-2 rounded-xl border border-border bg-surface-strong/60 px-3 py-2 text-sm text-muted-foreground hover:border-border-strong hover:bg-surface-strong transition"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump…</span>
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((l, i) => {
          const Icon = l.icon;
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 anim-fade-up ${
                active
                  ? "gradient-primary text-white shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-strong"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : ""}`} />
              <span>{l.label}</span>
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-strong transition"
        >
          {resolvedTheme === "dark" ? (
            <SunIcon className="h-4 w-4" />
          ) : (
            <MoonIcon className="h-4 w-4" />
          )}
          <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-danger hover:bg-surface-strong transition"
        >
          <LogoutIcon className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-[260px] flex-col glass px-5 py-7">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm anim-fade-in md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col glass-strong px-5 py-7 anim-slide-in-left md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            {navContent}
          </aside>
        </>
      ) : null}

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:ml-[260px]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 glass px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-foreground"
            aria-label="Open navigation"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="font-bold gradient-text">
            Finnova
          </Link>
          <button
            type="button"
            onClick={handleQuickAdd}
            className="p-2 -mr-2 text-primary"
            aria-label="Quick add"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-10">
          <div key={pathname} className="mx-auto max-w-7xl anim-fade-up">
            {children}
          </div>
        </main>

        <footer className="mt-auto px-4 md:px-8 py-6 text-center text-xs text-muted-foreground">
          Finnova · Built with care · Press{" "}
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold">
            ⌘K
          </kbd>{" "}
          anywhere to search
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
