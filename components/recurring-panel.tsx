"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  PlusIcon,
  RepeatIcon,
  TrashIcon,
  ZapIcon,
} from "@/components/ui/icons";

type Recurring = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  notes: string | null;
  active: boolean;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; type: string } | null;
};

type AccountOpt = { id: string; name: string; type: string };
type CategoryOpt = { id: string; name: string; type: string };

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";
const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function RecurringPanel({ currency }: { currency: string }) {
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, a, c] = await Promise.all([
      fetch("/api/recurring", { credentials: "include" }),
      fetch("/api/accounts", { credentials: "include" }),
      fetch("/api/categories", { credentials: "include" }),
    ]);
    const [rj, aj, cj] = await Promise.all([r.json(), a.json(), c.json()]);
    setLoading(false);
    if (r.ok) setItems(rj);
    if (a.ok) setAccounts(aj);
    if (c.ok) setCategories(cj);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this recurring schedule?")) return;
    const res = await fetch(`/api/recurring/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Schedule deleted", variant: "success" });
      void load();
    }
  }

  async function runDue() {
    setRunning(true);
    const res = await fetch("/api/recurring/run", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) {
      toast({ title: "Couldn't run", variant: "error" });
      return;
    }
    toast({
      title: `Posted ${data.ranCount ?? 0} transaction${data.ranCount === 1 ? "" : "s"}`,
      variant: "success",
    });
    void load();
  }

  const monthlyIncome = items
    .filter((i) => i.active && i.type === "INCOME" && i.frequency === "MONTHLY")
    .reduce((s, i) => s + Number(i.amount), 0);
  const monthlyExpense = items
    .filter((i) => i.active && i.type === "EXPENSE" && i.frequency === "MONTHLY")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Card
          icon={<ArrowUpIcon className="h-5 w-5" />}
          title="Monthly income"
          subtitle="Active recurring income"
        >
          <div className="text-3xl font-extrabold tabular-nums text-success">
            {fmt(monthlyIncome)}
          </div>
        </Card>
        <Card
          icon={<ArrowDownIcon className="h-5 w-5" />}
          title="Monthly expenses"
          subtitle="Active recurring expenses"
        >
          <div className="text-3xl font-extrabold tabular-nums text-danger">
            {fmt(monthlyExpense)}
          </div>
        </Card>
        <Card icon={<ZapIcon className="h-5 w-5" />} title="Automation" subtitle="Run due schedules">
          <Button variant="primary" className="w-full justify-center" loading={running} onClick={runDue}>
            Run now
          </Button>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Schedules
        </div>
        <Button variant="primary" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          New schedule
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <RepeatIcon className="h-7 w-7" />
            </div>
            <div className="text-base font-semibold text-foreground">No recurring items yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Automate salary, rent, subscriptions, and other predictable movements.
            </div>
            <div className="mt-5">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Add your first schedule
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((r, i) => (
            <div
              key={r.id}
              style={{ animationDelay: `${i * 50}ms` }}
              className="glass anim-fade-up hover-lift flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-xl ${
                    r.type === "INCOME" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                  }`}
                >
                  {r.type === "INCOME" ? (
                    <ArrowUpIcon className="h-5 w-5" />
                  ) : (
                    <ArrowDownIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold text-foreground">
                      {r.notes || r.category?.name || `${r.type.toLowerCase()} schedule`}
                    </div>
                    <Badge variant="info">{r.frequency.toLowerCase()}</Badge>
                    {!r.active && <Badge variant="outline">paused</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.account?.name}</span>
                    {r.category && <span>· {r.category.name}</span>}
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      next {new Date(r.nextRunDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`text-xl font-extrabold tabular-nums ${
                    r.type === "INCOME" ? "text-success" : "text-danger"
                  }`}
                >
                  {r.type === "EXPENSE" ? "−" : "+"}
                  {fmt(Number(r.amount))}
                </div>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => void remove(r.id)}>
                  <TrashIcon className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RecurringModal
          currency={currency}
          accounts={accounts}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void load();
            toast({ title: "Schedule created", variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function RecurringModal({
  currency,
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  currency: string;
  accounts: AccountOpt[];
  categories: CategoryOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function runSubmit() {
    setSaving(true);
    setError(null);
    const body = {
      accountId,
      categoryId: categoryId || null,
      amount: Number(amount),
      type,
      frequency,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      notes: notes || null,
    };
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save.");
      return;
    }
    onSaved();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New recurring transaction"
      description="Automate income or expenses on a schedule."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void runSubmit()}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`h-11 rounded-xl border text-sm font-semibold transition ${
                type === t
                  ? "gradient-primary text-white border-transparent shadow-[var(--shadow-glow)]"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-strong"
              }`}
            >
              {t[0] + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div>
          <label className={labelCls}>Account</label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={`mt-2 ${inputCls}`}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`mt-2 ${inputCls}`}
          >
            <option value="">Uncategorized</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount ({currency})</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className={`mt-2 ${inputCls}`}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start date</label>
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>End date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`mt-2 ${inputCls}`}
            placeholder="e.g. Netflix subscription"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
