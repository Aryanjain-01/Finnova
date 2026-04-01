"use client";

import { useCallback, useEffect, useState } from "react";

type SummaryItem = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: string;
  spent: number;
  remaining: number;
  status: "ok" | "near" | "over";
};

type CategoryOpt = { id: string; name: string; type: string };

export function BudgetsPanel({ currency }: { currency: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/budgets/summary?year=${year}&month=${month}`,
      { credentials: "include" },
    );
    const data = await res.json();
    if (res.ok) setSummary(data.items ?? []);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async summary fetch
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/categories?type=EXPENSE", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setCategories(data);
    })();
  }, []);

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!categoryId || !limit) return;
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        categoryId,
        year,
        month,
        limitAmount: Number(limit),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not save budget.");
      return;
    }
    setLimit("");
    setMessage("Budget saved.");
    void load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="font-medium">Year</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-500">Set or update budget</h2>
        <form onSubmit={saveBudget} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="font-medium">Expense category</span>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Limit ({currency})</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save budget
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-zinc-600">{message}</p> : null}
      </section>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No budgets for this month. Add one above.
                </td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.budgetId} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.categoryName}</td>
                  <td className="px-4 py-3 tabular-nums">{fmt(Number(row.limitAmount))}</td>
                  <td className="px-4 py-3 tabular-nums">{fmt(row.spent)}</td>
                  <td className="px-4 py-3 tabular-nums">{fmt(row.remaining)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "over"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          : row.status === "near"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                      }`}
                    >
                      {row.status === "over"
                        ? "Over budget"
                        : row.status === "near"
                          ? "Near limit"
                          : "On track"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
