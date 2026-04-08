import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { generateInsights } from "@/lib/insights";

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const insights = await generateInsights(r.userId);
  return NextResponse.json({ items: insights });
}
