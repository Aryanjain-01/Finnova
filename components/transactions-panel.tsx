"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  DownloadIcon,
  EditIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";

type Tx = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
  notes: string | null;
  tags: string | null;
  account: { id: string; name: string };
  toAccount: { id: string; name: string } | null;
  category: { id: string; name: string; type: string } | null;
};

type AccountOpt = { id: string; name: string; type: string };
type CategoryOpt = { id: string; name: string; type: string };

const inputCls =
  "h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary";

export function TransactionsPanel({ currency }: { currency: string }) {
  const [items, setItems] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("");
  const [applied, setApplied] = useState({
    q: "",
    from: "",
    to: "",
    accountId: "",
    categoryId: "",
    type: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const { toast } = useToast();

  const pageSize = 15;

  const loadLookups = useCallback(async () => {
    const [a, c] = await Promise.all([
      fetch("/api/accounts", { credentials: "include" }),
      fetch("/api/categories", { credentials: "include" }),
    ]);
    const aj = await a.json();
    const cj = await c.json();
    if (a.ok) setAccounts(aj);
    if (c.ok) setCategories(cj);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (applied.q.trim()) params.set("q", applied.q.trim());
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    if (applied.accountId) params.set("accountId", applied.accountId);
    if (applied.categoryId) params.set("categoryId", applied.categoryId);
    if (applied.type) params.set("type", applied.type);
    const res = await fetch(`/api/transactions?${params.toString()}`, {
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
  }, [page, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  // Listen for the global "quick add" event from the sidebar
  useEffect(() => {
    const handler = () => {
      setEditing(null);
      setModalOpen(true);
    };
    window.addEventListener("finnova:quick-add", handler);
    return () => window.removeEventListener("finnova:quick-add", handler);
  }, []);

  const fmt = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n),
    [currency],
  );

  const activeFilterCount = [
    applied.q,
    applied.from,
    applied.to,
    applied.accountId,
    applied.categoryId,
    applied.type,
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <Card
        icon={<FilterIcon className="h-5 w-5" />}
        title="Filters"
        subtitle={activeFilterCount > 0 ? `${activeFilterCount} active` : "Narrow down the list"}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<DownloadIcon className="h-4 w-4" />}
              onClick={() => window.open("/api/transactions/export", "_blank")}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search notes or tags"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`${inputCls} pl-9 min-w-[200px]`}
            />
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setApplied({ q, from, to, accountId, categoryId, type });
              setPage(1);
            }}
          >
            Apply
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
                setAccountId("");
                setCategoryId("");
                setType("");
                setApplied({ q: "", from: "", to: "", accountId: "", categoryId: "", type: "" });
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-strong/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-5 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                        <SearchIcon className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">No transactions yet</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Try adjusting your filters, or add your first transaction.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{ animationDelay: `${Math.min(i * 30, 180)}ms` }}
                    className="anim-fade-up border-b border-border/70 transition-colors hover:bg-surface-strong/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">
                      {new Date(t.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          t.type === "INCOME"
                            ? "success"
                            : t.type === "EXPENSE"
                              ? "warning"
                              : "info"
                        }
                      >
                        {t.type === "INCOME" ? (
                          <ArrowUpIcon className="h-3 w-3" />
                        ) : t.type === "EXPENSE" ? (
                          <ArrowDownIcon className="h-3 w-3" />
                        ) : (
                          <ArrowRightIcon className="h-3 w-3" />
                        )}
                        {t.type.toLowerCase()}
                      </Badge>
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 font-semibold tabular-nums ${
                        t.type === "INCOME"
                          ? "text-success"
                          : t.type === "EXPENSE"
                            ? "text-danger"
                            : "text-foreground"
                      }`}
                    >
                      {t.type === "EXPENSE" ? "−" : t.type === "INCOME" ? "+" : ""}
                      {fmt(Number(t.amount))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-foreground">
                      {t.account.name}
                      {t.toAccount ? (
                        <span className="text-muted-foreground"> → {t.toAccount.name}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {t.category?.name ?? "—"}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">
                      {t.notes ?? ""}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(t);
                            setModalOpen(true);
                          }}
                          aria-label="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm("Delete this transaction?")) return;
                            const r = await fetch(`/api/transactions/${t.id}`, {
                              method: "DELETE",
                              credentials: "include",
                            });
                            if (r.ok) {
                              toast({ title: "Transaction deleted", variant: "success" });
                              void load();
                            } else {
                              toast({ title: "Couldn't delete", variant: "error" });
                            }
                          }}
                          aria-label="Delete"
                        >
                          <TrashIcon className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span>
          Showing page <strong className="text-foreground">{page}</strong> of{" "}
          <strong className="text-foreground">{totalPages}</strong> · {total} total
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {modalOpen && (
        <TransactionModal
          currency={currency}
          accounts={accounts}
          categories={categories}
          initial={editing}
          onLookupsChanged={loadLookups}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void load();
            toast({
              title: editing ? "Transaction updated" : "Transaction added",
              variant: "success",
            });
          }}
        />
      )}
    </div>
  );
}

function TransactionModal({
  currency,
  accounts,
  categories,
  initial,
  onLookupsChanged,
  onClose,
  onSaved,
}: {
  currency: string;
  accounts: AccountOpt[];
  categories: CategoryOpt[];
  initial: Tx | null;
  onLookupsChanged: () => Promise<void> | void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ADD_ACCOUNT_VALUE = "__add_account__";
  const ADD_CATEGORY_VALUE = "__add_category__";
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">(initial?.type ?? "EXPENSE");
  const [accountId, setAccountId] = useState(initial?.account.id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(initial?.toAccount?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? "");
  const [amount, setAmount] = useState(initial ? initial.amount : "");
  const [date, setDate] = useState(
    initial ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);

  const filteredCategories = categories.filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : type === "EXPENSE" ? c.type === "EXPENSE" : false,
  );

  async function createAccount() {
    if (addingAccount) return null;
    const name = window.prompt("New account name");
    if (!name || !name.trim()) return null;
    const typeInput = window
      .prompt("Account type: CASH, BANK, CARD, or OTHER", "BANK")
      ?.trim()
      .toUpperCase();
    const accountType =
      typeInput === "CASH" || typeInput === "BANK" || typeInput === "CARD" || typeInput === "OTHER"
        ? typeInput
        : "BANK";
    setAddingAccount(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), type: accountType, currency }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingAccount(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add account.");
      return null;
    }
    await onLookupsChanged();
    return typeof data.id === "string" ? data.id : null;
  }

  async function handleAccountSelect(value: string, field: "from" | "to") {
    if (value !== ADD_ACCOUNT_VALUE) {
      if (field === "from") setAccountId(value);
      else setToAccountId(value);
      return;
    }
    const newId = await createAccount();
    if (!newId) return;
    if (field === "from") setAccountId(newId);
    else setToAccountId(newId);
  }

  async function createCategory() {
    if (addingCategory || type === "TRANSFER") return null;
    const name = window.prompt("New category name");
    if (!name || !name.trim()) return null;
    setAddingCategory(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), type }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingCategory(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add category.");
      return null;
    }
    await onLookupsChanged();
    return typeof data.id === "string" ? data.id : null;
  }

  async function handleCategorySelect(value: string) {
    if (value !== ADD_CATEGORY_VALUE) {
      setCategoryId(value);
      return;
    }
    const newId = await createCategory();
    if (!newId) return;
    setCategoryId(newId);
  }

  async function runSubmit() {
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      type,
      accountId,
      amount: Number(amount),
      date: new Date(date).toISOString(),
      notes: notes || null,
      tags: tags || null,
    };
    if (type === "TRANSFER") {
      body.toAccountId = toAccountId;
      body.categoryId = null;
    } else {
      body.categoryId = categoryId || null;
      body.toAccountId = null;
    }
    const url = initial ? `/api/transactions/${initial.id}` : "/api/transactions";
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
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

  const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
  const selectCls =
    "mt-2 w-full h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";
  const inputCls2 =
    "mt-2 w-full h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit transaction" : "New transaction"}
      description={initial ? "Update the details below." : "Log a new movement in your accounts."}
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
        <div className="grid grid-cols-3 gap-2">
          {(["INCOME", "EXPENSE", "TRANSFER"] as const).map((t) => (
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
            onChange={(e) => void handleAccountSelect(e.target.value, "from")}
            className={selectCls}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value={ADD_ACCOUNT_VALUE}>
              {addingAccount ? "Adding…" : "+ Add new account"}
            </option>
          </select>
        </div>
        {type === "TRANSFER" ? (
          <div>
            <label className={labelCls}>To account</label>
            <select
              required
              value={toAccountId}
              onChange={(e) => void handleAccountSelect(e.target.value, "to")}
              className={selectCls}
            >
              <option value="">Select…</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              <option value={ADD_ACCOUNT_VALUE}>
                {addingAccount ? "Adding…" : "+ Add new account"}
              </option>
            </select>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => void handleCategorySelect(e.target.value)}
              className={selectCls}
            >
              <option value="">Uncategorized</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={ADD_CATEGORY_VALUE}>
                {addingCategory ? "Adding…" : "+ Add new category"}
              </option>
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls2}
            />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls2}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls2}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className={labelCls}>Tags</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputCls2}
            placeholder="Comma-separated"
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </Modal>
  );
}
