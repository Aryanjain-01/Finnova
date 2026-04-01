import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { monthlyTrends } from "@/lib/finance";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const { searchParams } = new URL(req.url);
  const months = Math.min(24, Math.max(3, Number(searchParams.get("months") ?? "12") || 12));

  const series = await monthlyTrends(r.userId, months);
  return NextResponse.json({ months, series });
}
