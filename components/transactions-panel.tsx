"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
    const res = await fetch(`/api/transactions?${params.toString()}`, { credentials: "include" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
  }, [page, applied]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async list fetch
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async list fetch
    void loadLookups();
  }, [loadLookups]);

  const fmt = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n),
    [currency],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search notes or tags"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setApplied({ q, from, to, accountId, categoryId, type });
              setPage(1);
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add transaction
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-200">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{t.type}</td>
                  <td
                    className={`px-4 py-3 font-medium tabular-nums ${
                      t.type === "INCOME"
                        ? "text-emerald-600"
                        : t.type === "EXPENSE"
                          ? "text-orange-600"
                          : "text-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {t.type === "EXPENSE" ? "-" : t.type === "INCOME" ? "+" : ""}
                    {fmt(Number(t.amount))}
                  </td>
                  <td className="px-4 py-3">
                    {t.account.name}
                    {t.toAccount ? ` → ${t.toAccount.name}` : ""}
                  </td>
                  <td className="px-4 py-3">{t.category?.name ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {t.notes ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-2 text-emerald-700 hover:underline dark:text-emerald-400"
                      onClick={() => {
                        setEditing(t);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        if (!confirm("Delete this transaction?")) return;
                        await fetch(`/api/transactions/${t.id}`, { method: "DELETE", credentials: "include" });
                        void load();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>
          Page {page} — {total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen ? (
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
          }}
        />
      ) : null}
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
      body: JSON.stringify({
        name: name.trim(),
        type: accountType,
        currency,
      }),
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
      body: JSON.stringify({
        name: name.trim(),
        type,
      }),
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{initial ? "Edit transaction" : "New transaction"}</h2>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Account</span>
            <select
              required
              value={accountId}
              onChange={(e) => {
                void handleAccountSelect(e.target.value, "from");
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value={ADD_ACCOUNT_VALUE}>
                {addingAccount ? "Adding account..." : "+ Add new account"}
              </option>
            </select>
          </label>
          {type === "TRANSFER" ? (
            <label className="text-sm">
              <span className="font-medium">To account</span>
              <select
                required
                value={toAccountId}
                onChange={(e) => {
                  void handleAccountSelect(e.target.value, "to");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select…</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
                <option value={ADD_ACCOUNT_VALUE}>
                  {addingAccount ? "Adding account..." : "+ Add new account"}
                </option>
              </select>
            </label>
          ) : (
            <label className="text-sm">
              <span className="font-medium">Category</span>
              <select
                value={categoryId}
                onChange={(e) => {
                  void handleCategorySelect(e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Uncategorized</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={ADD_CATEGORY_VALUE}>
                  {addingCategory ? "Adding category..." : "+ Add new category"}
                </option>
              </select>
            </label>
          )}
          <label className="text-sm">
            <span className="font-medium">Amount ({currency})</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Tags</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
