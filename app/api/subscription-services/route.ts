import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const services = await prisma.subscriptionService.findMany({
    include: {
      plans: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(services);
}
