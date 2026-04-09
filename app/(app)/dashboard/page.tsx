import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  categoryBreakdown,
  computeAccountBalances,
  formatMoney,
  monthlyTrends,
  monthBounds,
  periodTotals,
} from "@/lib/finance";
import { generateInsights } from "@/lib/insights";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CategoryDonut,
  NetWorthBar,
  TrendsArea,
} from "@/components/dashboard-charts";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PiggyBankIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/ui/icons";

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

function insightAccent(kind: string) {
  if (kind === "positive") return "success" as const;
  if (kind === "warning") return "warning" as const;
  if (kind === "info") return "info" as const;
  return "default" as const;
}

async function safeGoalsQuery(userId: string) {
  try {
    return await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 3,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }
    throw error;
  }
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

  const [curTotals, breakdown, trends, goals, { accounts, balances }] = await Promise.all([
    periodTotals(userId, start, end),
    categoryBreakdown(userId, start, end),
    monthlyTrends(userId, 12, new Date(year, month - 1, 1)),
    safeGoalsQuery(userId),
    computeAccountBalances(userId),
  ]);

  const prevMonth = new Date(year, month - 2, 1);
  const prevBounds = monthBounds(prevMonth.getFullYear(), prevMonth.getMonth() + 1);
  const prevTotals = await periodTotals(userId, prevBounds.start, prevBounds.end);
  const insights = await generateInsights(userId);

  const income = curTotals.income;
  const expense = curTotals.expense;
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;

  const expenseDelta =
    prevTotals.expense > 0 ? (expense - prevTotals.expense) / prevTotals.expense : 0;
  const incomeDelta =
    prevTotals.income > 0 ? (income - prevTotals.income) / prevTotals.income : 0;

  const topCategories = [...breakdown].sort((a, b) => b.total - a.total).slice(0, 5);
  const topTotal = topCategories.reduce((sum, c) => sum + c.total, 0);

  const trendData = trends.map((t) => ({
    key: t.key.slice(2).replace("-", "/"),
    income: t.income,
    expense: t.expense,
  }));
  const netData = trends.map((t) => ({
    key: t.key.slice(2).replace("-", "/"),
    net: t.income - t.expense,
  }));

  const totalBalance = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={monthLabel}
        title={firstName ? `Hello, ${firstName}` : "Hello there"}
        description="Here’s the story your money is telling this month."
        icon={<SparklesIcon className="h-5 w-5" />}
        action={
          <form method="GET" className="flex items-end gap-2">
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Year</span>
              <input
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={year}
                className="h-10 w-24 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Month</span>
              <select
                name="month"
                defaultValue={String(month)}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
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
              className="h-10 rounded-xl gradient-primary px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)]"
            >
              Apply
            </button>
          </form>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Income"
          value={formatMoney(income, currency)}
          delta={
            incomeDelta !== 0 ? { value: incomeDelta * 100, label: "vs last month" } : undefined
          }
          icon={<ArrowUpIcon className="h-5 w-5" />}
          accent="success"
        />
        <StatTile
          label="Expenses"
          value={formatMoney(expense, currency)}
          delta={
            expenseDelta !== 0
              ? { value: -expenseDelta * 100, label: "vs last month" }
              : undefined
          }
          icon={<ArrowDownIcon className="h-5 w-5" />}
          accent="warning"
        />
        <StatTile
          label="Net"
          value={formatMoney(net, currency)}
          icon={<TrendingUpIcon className="h-5 w-5" />}
          accent={net >= 0 ? "success" : "danger"}
        />
        <StatTile
          label="Net worth"
          value={formatMoney(totalBalance, currency)}
          icon={<WalletIcon className="h-5 w-5" />}
          accent="primary"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Income vs expenses"
          subtitle="Last 12 months"
          icon={<TrendingUpIcon className="h-5 w-5" />}
        >
          <TrendsArea currency={currency} data={trendData} />
        </Card>
        <Card
          title="Expense breakdown"
          subtitle={`Top categories · ${monthLabel}`}
          icon={<WalletIcon className="h-5 w-5" />}
        >
          <CategoryDonut currency={currency} data={breakdown.map((b) => ({ name: b.name, total: b.total }))} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Insights"
          subtitle="Auto-generated from your data"
          icon={<SparklesIcon className="h-5 w-5" />}
          className="lg:col-span-2"
        >
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a few transactions and insights will start to appear here.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {insights.map((i, idx) => (
                <li
                  key={i.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className="anim-fade-up group relative rounded-2xl border border-border bg-surface/80 p-4 transition hover:border-border-strong hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {i.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {i.description}
                      </div>
                    </div>
                    <Badge variant={insightAccent(i.kind)}>{i.kind}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Savings rate"
          subtitle={`${(savingsRate * 100).toFixed(1)}% of income kept`}
          icon={<PiggyBankIcon className="h-5 w-5" />}
        >
          <div className="flex items-end gap-4">
            <div className="text-5xl font-black gradient-text tabular-nums">
              {Math.round(savingsRate * 100)}
              <span className="text-2xl">%</span>
            </div>
          </div>
          <div className="mt-5">
            <Progress
              value={Math.max(0, Math.min(100, savingsRate * 100))}
              variant={savingsRate >= 0.2 ? "success" : savingsRate >= 0.1 ? "default" : "warning"}
              animated
            />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Healthy savings rates are typically 20% or more of income.
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Net cashflow trend"
          subtitle="Monthly income minus expenses"
          icon={<TrendingUpIcon className="h-5 w-5" />}
        >
          <NetWorthBar currency={currency} data={netData} />
        </Card>

        <Card
          title="Savings goals"
          subtitle="Your active targets"
          icon={<TargetIcon className="h-5 w-5" />}
        >
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no savings goals yet. Visit the Goals page to create one.
            </p>
          ) : (
            <ul className="space-y-4">
              {goals.map((g) => {
                const target = Number(g.targetAmount);
                const cur = Number(g.currentAmount);
                const pct = target > 0 ? Math.min(100, (cur / target) * 100) : 0;
                return (
                  <li key={g.id} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {g.name}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatMoney(cur, currency)} / {formatMoney(target, currency)}
                      </div>
                    </div>
                    <Progress value={pct} variant="default" />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Top spending categories"
        subtitle={monthLabel}
        icon={<WalletIcon className="h-5 w-5" />}
      >
        {topCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {topCategories.map((c, i) => {
              const pct = topTotal > 0 ? (c.total / topTotal) * 100 : 0;
              return (
                <li
                  key={c.categoryId ?? c.name}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="anim-fade-up flex items-center gap-4 py-3"
                >
                  <div className="w-32 text-sm font-medium text-foreground truncate">
                    {c.name}
                  </div>
                  <div className="flex-1">
                    <Progress value={pct} />
                  </div>
                  <div className="w-28 text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(c.total, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
