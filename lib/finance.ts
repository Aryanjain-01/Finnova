import { prisma } from "@/lib/prisma";

export function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function computeAccountBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const txs = await prisma.transaction.findMany({ where: { userId } });
  const balances = new Map<string, number>();
  for (const a of accounts) balances.set(a.id, 0);
  for (const t of txs) {
    const amt = Number(t.amount);
    if (t.type === "INCOME") {
      balances.set(t.accountId, (balances.get(t.accountId) ?? 0) + amt);
    } else if (t.type === "EXPENSE") {
      balances.set(t.accountId, (balances.get(t.accountId) ?? 0) - amt);
    } else if (t.type === "TRANSFER" && t.toAccountId) {
      balances.set(t.accountId, (balances.get(t.accountId) ?? 0) - amt);
      balances.set(t.toAccountId, (balances.get(t.toAccountId) ?? 0) + amt);
    }
  }
  return { accounts, balances };
}

export async function periodTotals(
  userId: string,
  start: Date,
  end: Date,
): Promise<{ income: number; expense: number }> {
  const agg = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      date: { gte: start, lte: end },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    _sum: { amount: true },
  });
  let income = 0;
  let expense = 0;
  for (const row of agg) {
    const v = Number(row._sum.amount ?? 0);
    if (row.type === "INCOME") income += v;
    if (row.type === "EXPENSE") expense += v;
  }
  return { income, expense };
}

export async function categoryBreakdown(
  userId: string,
  start: Date,
  end: Date,
): Promise<{ categoryId: string | null; name: string; total: number }[]> {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
      type: "EXPENSE",
    },
    include: { category: true },
  });
  const map = new Map<string | null, { name: string; total: number }>();
  for (const t of txs) {
    const key = t.categoryId;
    const name = t.category?.name ?? "Uncategorized";
    const prev = map.get(key) ?? { name, total: 0 };
    prev.total += Number(t.amount);
    map.set(key, prev);
  }
  return [...map.entries()].map(([categoryId, v]) => ({
    categoryId,
    name: v.name,
    total: v.total,
  }));
}

export async function monthlyTrends(
  userId: string,
  monthsBack: number,
  referenceDate?: Date,
): Promise<{ key: string; year: number; month: number; income: number; expense: number }[]> {
  const anchor = referenceDate ?? new Date();
  const results: {
    key: string;
    year: number;
    month: number;
    income: number;
    expense: number;
  }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const { start, end } = monthBounds(y, m);
    const { income, expense } = await periodTotals(userId, start, end);
    results.push({
      key: `${y}-${String(m).padStart(2, "0")}`,
      year: y,
      month: m,
      income,
      expense,
    });
  }
  return results;
}

export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}
