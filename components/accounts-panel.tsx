"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  BanknoteIcon,
  CreditCardIcon,
  PiggyBankIcon,
  PlusIcon,
  WalletIcon,
} from "@/components/ui/icons";

type AccountRow = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "CARD" | "OTHER" | string;
  currency: string;
  archived: boolean;
  balance: number;
};

function iconForType(type: string) {
  if (type === "CASH") return <BanknoteIcon className="h-5 w-5" />;
  if (type === "CARD") return <CreditCardIcon className="h-5 w-5" />;
  if (type === "BANK") return <PiggyBankIcon className="h-5 w-5" />;
  return <WalletIcon className="h-5 w-5" />;
}

export function AccountsPanel({ currency }: { currency: string }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"CASH" | "BANK" | "CARD" | "OTHER">("BANK");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/accounts", { credentials: "include" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setAccounts(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not create account.");
      return;
    }
    setName("");
    void load();
    toast({ title: "Account added", variant: "success" });
  }

  async function toggleArchive(a: AccountRow) {
    const res = await fetch(`/api/accounts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ archived: !a.archived }),
    });
    if (res.ok) {
      void load();
      toast({
        title: a.archived ? "Account restored" : "Account archived",
        variant: "success",
      });
    }
  }

  const totalBalance = accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.balance, 0);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  const inputCls =
    "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Card
          variant="gradient"
          className="md:col-span-2"
          title="Total net worth"
          subtitle="Sum of all active account balances"
          icon={<WalletIcon className="h-5 w-5" />}
        >
          <div className="text-5xl font-black tabular-nums">{fmt(totalBalance)}</div>
          <div className="mt-3 text-sm text-white/80">
            Across {active.length} active account{active.length === 1 ? "" : "s"}
          </div>
        </Card>
        <Card title="Add account" subtitle="Track a new source of money" icon={<PlusIcon className="h-5 w-5" />}>
          <form onSubmit={addAccount} className="space-y-3">
            <input
              required
              placeholder="Account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputCls} w-full`}
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className={`${inputCls} w-full`}
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
            <Button type="submit" variant="primary" size="md" className="w-full justify-center">
              Add account
            </Button>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </form>
        </Card>
      </div>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No active accounts yet. Add your first one above.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a, i) => (
              <div
                key={a.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="glass anim-fade-up hover-lift group relative rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                      {iconForType(a.type)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{a.name}</div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {a.type}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{a.currency}</Badge>
                </div>
                <div className="mt-5 text-3xl font-extrabold tabular-nums text-foreground">
                  {fmt(a.balance)}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => void toggleArchive(a)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Archived
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-dashed border-border p-4 opacity-70"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">{a.name}</div>
                  <Button variant="ghost" size="sm" onClick={() => void toggleArchive(a)}>
                    Restore
                  </Button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.type} · {fmt(a.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
