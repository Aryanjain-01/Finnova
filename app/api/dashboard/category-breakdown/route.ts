import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { categoryBreakdown, monthBounds } from "@/lib/finance";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  const { start, end } = monthBounds(year, month);
  const items = await categoryBreakdown(r.userId, start, end);

  return NextResponse.json({ year, month, items });
}
