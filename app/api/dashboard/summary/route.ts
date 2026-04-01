import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { monthBounds, periodTotals } from "@/lib/finance";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  const { start, end } = monthBounds(year, month);
  const { income, expense } = await periodTotals(r.userId, start, end);
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;

  return NextResponse.json({
    year,
    month,
    income,
    expense,
    net,
    savingsRate,
  });
}
