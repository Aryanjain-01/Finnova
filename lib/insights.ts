import { prisma } from "@/lib/prisma";
import { categoryBreakdown, monthBounds, monthlyTrends, periodTotals } from "@/lib/finance";

export type Insight = {
  id: string;
  kind: "positive" | "warning" | "neutral" | "info";
  title: string;
  description: string;
  value?: number;
};

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function fmtINR(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generateInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { start: curStart, end: curEnd } = monthBounds(year, month);
  const prev = new Date(year, month - 2, 1);
  const { start: prevStart, end: prevEnd } = monthBounds(
    prev.getFullYear(),
    prev.getMonth() + 1,
  );

  const curTotals = await periodTotals(userId, curStart, curEnd);
  const prevTotals = await periodTotals(userId, prevStart, prevEnd);

  // 1. Spending change vs last month
  if (prevTotals.expense > 0) {
    const change = (curTotals.expense - prevTotals.expense) / prevTotals.expense;
    if (Math.abs(change) >= 0.03) {
      insights.push({
        id: "spend-change",
        kind: change > 0 ? "warning" : "positive",
        title:
          change > 0
            ? `Spending up ${pct(change)} vs last month`
            : `Spending down ${pct(Math.abs(change))} vs last month`,
        description:
          change > 0
            ? "Watch your top categories — consider tightening the biggest drivers."
            : "Nice work keeping expenses in check this month.",
        value: curTotals.expense,
      });
    }
  } else if (curTotals.expense > 0) {
    insights.push({
      id: "first-expense",
      kind: "info",
      title: "First month of tracked spending",
      description: `You've logged ${fmtINR(curTotals.expense)} in expenses so far.`,
      value: curTotals.expense,
    });
  }

  // 2. Top category this month
  const breakdown = await categoryBreakdown(userId, curStart, curEnd);
  const sorted = [...breakdown].sort((a, b) => b.total - a.total);
  if (sorted.length) {
    const top = sorted[0];
    insights.push({
      id: "top-category",
      kind: "neutral",
      title: `Top category: ${top.name}`,
      description: `${fmtINR(top.total)} spent in ${top.name} this month.`,
      value: top.total,
    });
  }

  // 3. Savings streak
  const trends = await monthlyTrends(userId, 6);
  let streak = 0;
  for (let i = trends.length - 1; i >= 0; i--) {
    if (trends[i].income - trends[i].expense > 0) streak++;
    else break;
  }
  if (streak >= 2) {
    insights.push({
      id: "streak",
      kind: "positive",
      title: `${streak}-month savings streak`,
      description: "You've had positive net cashflow for consecutive months. Keep it up.",
      value: streak,
    });
  }

  // 4. Largest single transaction this month
  const largest = await prisma.transaction.findFirst({
    where: {
      userId,
      date: { gte: curStart, lte: curEnd },
      type: "EXPENSE",
    },
    orderBy: { amount: "desc" },
    include: { account: true, category: true },
  });
  if (largest) {
    const d = new Date(largest.date).toLocaleDateString();
    insights.push({
      id: "largest-tx",
      kind: "info",
      title: `Largest expense: ${fmtINR(Number(largest.amount))}`,
      description: `${largest.category?.name ?? "Uncategorized"} · ${largest.account.name} · ${d}`,
      value: Number(largest.amount),
    });
  }

  // 5. Projected end of month
  const daysIn = new Date(year, month, 0).getDate();
  const dayOfMonth = Math.max(1, now.getDate());
  if (dayOfMonth < daysIn && curTotals.expense > 0) {
    const projected = (curTotals.expense / dayOfMonth) * daysIn;
    insights.push({
      id: "projection",
      kind: projected > prevTotals.expense && prevTotals.expense > 0 ? "warning" : "info",
      title: `Projected month-end: ${fmtINR(projected)}`,
      description: `Based on ${dayOfMonth}/${daysIn} days elapsed at current pace.`,
      value: projected,
    });
  }

  // 6. Budget alerts
  const budgets = await prisma.budget.findMany({
    where: { userId, year, month },
    include: { category: true },
  });
  if (budgets.length) {
    const expenseTx = await prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: curStart, lte: curEnd },
        categoryId: { not: null },
      },
    });
    const spent = new Map<string, number>();
    for (const t of expenseTx) {
      if (!t.categoryId) continue;
      spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + Number(t.amount));
    }
    const over = budgets.filter(
      (b) => (spent.get(b.categoryId) ?? 0) >= Number(b.limitAmount),
    );
    if (over.length) {
      insights.push({
        id: "budget-over",
        kind: "warning",
        title: `${over.length} budget${over.length > 1 ? "s" : ""} over limit`,
        description: over.map((b) => b.category.name).slice(0, 3).join(", "),
        value: over.length,
      });
    }
  }

  return insights.slice(0, 6);
}
