"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HomeIcon,
  ListIcon,
  WalletIcon,
  PiggyBankIcon,
  TargetIcon,
  RepeatIcon,
  SettingsIcon,
  PlusIcon,
  DownloadIcon,
  SearchIcon,
  CommandIcon,
  SparklesIcon,
} from "@/components/ui/icons";

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  group: "Navigate" | "Actions";
  keywords?: string;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // External open events (e.g. from keyboard shortcuts elsewhere)
  useEffect(() => {
    const onOpenEvent = () => onOpenChange(true);
    window.addEventListener("finnova:open-palette", onOpenEvent);
    return () => window.removeEventListener("finnova:open-palette", onOpenEvent);
  }, [onOpenChange]);

  // Reset on close; focus + reset query on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = useMemo<PaletteItem[]>(
    () => [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        hint: "Overview & insights",
        icon: HomeIcon,
        group: "Navigate",
        keywords: "home overview",
        run: () => router.push("/dashboard"),
      },
      {
        id: "nav-transactions",
        label: "Transactions",
        hint: "All your activity",
        icon: ListIcon,
        group: "Navigate",
        keywords: "expenses income list",
        run: () => router.push("/transactions"),
      },
      {
        id: "nav-budgets",
        label: "Budgets",
        hint: "Monthly limits",
        icon: WalletIcon,
        group: "Navigate",
        keywords: "limits spending",
        run: () => router.push("/budgets"),
      },
      {
        id: "nav-accounts",
        label: "Accounts",
        hint: "Cards, wallets, banks",
        icon: PiggyBankIcon,
        group: "Navigate",
        keywords: "bank wallet card",
        run: () => router.push("/accounts"),
      },
      {
        id: "nav-goals",
        label: "Goals",
        hint: "Savings targets",
        icon: TargetIcon,
        group: "Navigate",
        keywords: "savings target",
        run: () => router.push("/goals"),
      },
      {
        id: "nav-recurring",
        label: "Recurring",
        hint: "Automated entries",
        icon: RepeatIcon,
        group: "Navigate",
        keywords: "subscription auto schedule",
        run: () => router.push("/recurring"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        hint: "Preferences & profile",
        icon: SettingsIcon,
        group: "Navigate",
        keywords: "profile preferences",
        run: () => router.push("/settings"),
      },
      {
        id: "action-add-transaction",
        label: "Add transaction",
        hint: "Quickly log income or expense",
        icon: PlusIcon,
        group: "Actions",
        keywords: "new create quick add entry",
        run: () => window.dispatchEvent(new Event("finnova:quick-add")),
      },
      {
        id: "action-add-goal",
        label: "Add goal",
        hint: "Create a savings target",
        icon: TargetIcon,
        group: "Actions",
        keywords: "new goal target savings",
        run: () => router.push("/goals"),
      },
      {
        id: "action-export-csv",
        label: "Export CSV",
        hint: "Download all transactions",
        icon: DownloadIcon,
        group: "Actions",
        keywords: "download export csv backup",
        run: () => window.open("/api/transactions/export"),
      },
    ],
    [router]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const pick = useCallback(
    (item: PaletteItem) => {
      close();
      // Defer so the close transition doesn't fight route changes
      window.setTimeout(() => item.run(), 0);
    },
    [close]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) =>
          filtered.length ? (a - 1 + filtered.length) % filtered.length : 0
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[active];
        if (item) pick(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, pick, close]);

  // Scroll active into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const grouped: Record<PaletteItem["group"], { item: PaletteItem; index: number }[]> = {
    Navigate: [],
    Actions: [],
  };
  filtered.forEach((item, index) => {
    grouped[item.group].push({ item, index });
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={close}
      />
      <div
        className="glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong shadow-2xl anim-scale-in"
        style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div className="h-12 w-12 rounded-2xl gradient-primary grid place-items-center">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm font-semibold text-foreground">Nothing here</div>
              <div className="text-xs text-muted-foreground">
                Try a different search. Open anywhere with{" "}
                <kbd className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold">
                  <CommandIcon className="h-3 w-3" />K
                </kbd>
                .
              </div>
            </div>
          ) : (
            (Object.keys(grouped) as PaletteItem["group"][]).map((group) => {
              const entries = grouped[group];
              if (!entries.length) return null;
              return (
                <div key={group} className="mb-1 last:mb-0">
                  <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group}
                  </div>
                  {entries.map(({ item, index }) => {
                    const Icon = item.icon;
                    const isActive = index === active;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => pick(item)}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          isActive
                            ? "bg-primary-soft text-foreground"
                            : "text-foreground/90 hover:bg-surface-strong"
                        }`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-lg ${
                            isActive
                              ? "gradient-primary text-white"
                              : "bg-surface-strong text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{item.label}</div>
                          {item.hint ? (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.hint}
                            </div>
                          ) : null}
                        </div>
                        {isActive ? (
                          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            ↵
                          </kbd>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px] font-semibold">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px] font-semibold">
                ↵
              </kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            Finnova
            <SparklesIcon className="h-3 w-3 text-primary" />
          </span>
        </div>
      </div>
    </div>
  );
}
