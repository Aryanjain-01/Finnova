import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { monthBounds } from "@/lib/finance";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  const { start, end } = monthBounds(year, month);

  const budgets = await prisma.budget.findMany({
    where: { userId: r.userId, year, month },
    include: { category: true },
  });

  const txs = await prisma.transaction.findMany({
    where: {
      userId: r.userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
      categoryId: { not: null },
    },
  });

  const spentByCategory = new Map<string, number>();
  for (const t of txs) {
    if (!t.categoryId) continue;
    spentByCategory.set(
      t.categoryId,
      (spentByCategory.get(t.categoryId) ?? 0) + Number(t.amount),
    );
  }

  const items = budgets.map((b) => {
    const spent = spentByCategory.get(b.categoryId) ?? 0;
    const limit = Number(b.limitAmount);
    const remaining = limit - spent;
    const ratio = limit > 0 ? spent / limit : 0;
    let status: "ok" | "near" | "over" = "ok";
    if (ratio >= 1) status = "over";
    else if (ratio >= 0.85) status = "near";
    return {
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      limitAmount: b.limitAmount.toString(),
      spent,
      remaining,
      status,
    };
  });

  return NextResponse.json({ year, month, items });
}
