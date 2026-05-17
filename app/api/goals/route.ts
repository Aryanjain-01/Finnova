import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { savingsGoalCreateSchema } from "@/lib/validations";

function serialize<T extends { targetAmount: Prisma.Decimal; currentAmount: Prisma.Decimal }>(g: T) {
  return {
    ...g,
    targetAmount: g.targetAmount.toString(),
    currentAmount: g.currentAmount.toString(),
  };
}

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: r.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(goals.map(serialize));
}

export async function POST(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = savingsGoalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: r.userId,
      name: parsed.data.name,
      targetAmount: new Prisma.Decimal(parsed.data.targetAmount),
      currentAmount: new Prisma.Decimal(parsed.data.currentAmount ?? 0),
      deadline: parsed.data.deadline ?? null,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
    },
  });

  return NextResponse.json(serialize(goal));
}
