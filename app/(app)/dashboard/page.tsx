import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { categoryBreakdown, formatMoney, monthlyTrends, monthBounds, periodTotals } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryPie, TrendsLine } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{ year?: string; month?: string }>;
};

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.trunc(n);
  if (v < min || v > max) return fallback;
  return v;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const currency = "INR";

  const now = new Date();
  const params = (await searchParams) ?? {};
  const year = clampInt(params.year, now.getFullYear(), 2000, 2100);
  const month = clampInt(params.month, now.getMonth() + 1, 1, 12);
  const { start, end } = monthBounds(year, month);
  const { income, expense } = await periodTotals(userId, start, end);
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;

  const breakdown = await categoryBreakdown(userId, start, end);
  const topCategories = [...breakdown].sort((a, b) => b.total - a.total).slice(0, 5);

  const trends = await monthlyTrends(userId, 12, new Date(year, month - 1, 1));
  const trendData = trends.map((t) => ({
    key: t.key,
    income: t.income,
    expense: t.expense,
  }));

  return (
    <div>
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name}` : ""}`}
        description="Overview of your finances for the selected month and recent trends."
      />

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="font-medium">Year</span>
            <input
              name="year"
              type="number"
              min={2000}
              max={2100}
              defaultValue={year}
              className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Month</span>
            <select
              name="month"
              defaultValue={String(month)}
              className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Income">
          <p className="text-3xl font-semibold tabular-nums text-emerald-600">
            {formatMoney(income, currency)}
          </p>
        </Card>
        <Card title="Expenses">
          <p className="text-3xl font-semibold tabular-nums text-orange-600">
            {formatMoney(expense, currency)}
          </p>
        </Card>
        <Card title="Net & savings rate">
          <p className="text-3xl font-semibold tabular-nums">{formatMoney(net, currency)}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Savings rate: {(savingsRate * 100).toFixed(1)}%
          </p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Expense breakdown">
          <CategoryPie
            currency={currency}
            data={breakdown.map((b) => ({ name: b.name, total: b.total }))}
          />
        </Card>
        <Card title="Income vs expenses (12 months)">
          <TrendsLine currency={currency} data={trendData} />
        </Card>
      </div>

      <div className="mt-8">
        <Card title="Top spending categories">
          {topCategories.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses recorded this month yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {topCategories.map((c) => (
                <li key={c.categoryId ?? c.name} className="flex justify-between py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium tabular-nums">{formatMoney(c.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
