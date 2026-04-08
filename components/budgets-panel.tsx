"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  WalletIcon,
} from "@/components/ui/icons";

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
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const { toast } = useToast();

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/budgets/summary?year=${year}&month=${month}`, {
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSummary(data.items ?? []);
  }, [year, month]);

  useEffect(() => {
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
    if (!categoryId || !limit) return;
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ categoryId, year, month, limitAmount: Number(limit) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Couldn't save budget",
        description: typeof data.error === "string" ? data.error : undefined,
        variant: "error",
      });
      return;
    }
    setLimit("");
    toast({ title: "Budget saved", variant: "success" });
    void load();
  }

  const totalLimit = summary.reduce((sum, s) => sum + Number(s.limitAmount), 0);
  const totalSpent = summary.reduce((sum, s) => sum + s.spent, 0);
  const overCount = summary.filter((s) => s.status === "over").length;

  const inputCls =
    "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Card
          icon={<WalletIcon className="h-5 w-5" />}
          title="Monthly budget"
          subtitle="Total limits set for this month"
        >
          <div className="text-3xl font-extrabold tabular-nums text-foreground">
            {fmt(totalLimit)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{summary.length} categories</div>
        </Card>
        <Card
          icon={<CheckCircleIcon className="h-5 w-5" />}
          title="Spent so far"
          subtitle={`${totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0}% of budget`}
        >
          <div className="text-3xl font-extrabold tabular-nums text-foreground">
            {fmt(totalSpent)}
          </div>
          <div className="mt-3">
            <Progress
              value={totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0}
              variant={
                totalSpent >= totalLimit ? "danger" : totalSpent >= totalLimit * 0.85 ? "warning" : "default"
              }
              animated
            />
          </div>
        </Card>
        <Card
          icon={<AlertTriangleIcon className="h-5 w-5" />}
          title="Alerts"
          subtitle="Categories over limit"
        >
          <div className="text-3xl font-extrabold tabular-nums text-foreground">{overCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {overCount === 0 ? "You're on track." : "Reduce spending in these categories."}
          </div>
        </Card>
      </div>

      <Card
        icon={<PlusIcon className="h-5 w-5" />}
        title="Set budget"
        subtitle="Create or update a monthly category limit"
      >
        <form onSubmit={saveBudget} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={`mt-1 block w-28 ${inputCls}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={`mt-1 block ${inputCls}`}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`mt-1 block ${inputCls}`}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Limit ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={`mt-1 block w-36 ${inputCls}`}
            />
          </div>
          <Button type="submit" variant="primary">
            Save budget
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          By category
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : summary.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No budgets for this month. Add one above.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {summary.map((row, i) => {
              const limitN = Number(row.limitAmount);
              const pct = limitN > 0 ? Math.min(100, (row.spent / limitN) * 100) : 0;
              const variant: "default" | "warning" | "danger" =
                row.status === "over" ? "danger" : row.status === "near" ? "warning" : "default";
              const badge: "success" | "warning" | "danger" =
                row.status === "over" ? "danger" : row.status === "near" ? "warning" : "success";
              return (
                <div
                  key={row.budgetId}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="glass anim-fade-up hover-lift rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-foreground">
                        {row.categoryName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmt(row.spent)} of {fmt(limitN)} ·{" "}
                        <span
                          className={
                            row.remaining < 0 ? "text-danger font-semibold" : "text-muted-foreground"
                          }
                        >
                          {row.remaining >= 0
                            ? `${fmt(row.remaining)} remaining`
                            : `${fmt(Math.abs(row.remaining))} over`}
                        </span>
                      </div>
                    </div>
                    <Badge variant={badge}>
                      {row.status === "over" ? "Over" : row.status === "near" ? "Near" : "On track"}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <Progress value={pct} variant={variant} animated={row.status === "over"} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
