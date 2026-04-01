import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { categoryBreakdown, formatMoney, monthlyTrends, monthBounds, periodTotals } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryPie, TrendsLine } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, name: true },
  });
  const currency = user?.currency ?? "USD";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start, end } = monthBounds(year, month);
  const { income, expense } = await periodTotals(userId, start, end);
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;

  const breakdown = await categoryBreakdown(userId, start, end);
  const topCategories = [...breakdown].sort((a, b) => b.total - a.total).slice(0, 5);

  const trends = await monthlyTrends(userId, 12);
  const trendData = trends.map((t) => ({
    key: t.key,
    income: t.income,
    expense: t.expense,
  }));

  return (
    <div>
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name}` : ""}`}
        description="Overview of your finances for the current month and recent trends."
      />

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
