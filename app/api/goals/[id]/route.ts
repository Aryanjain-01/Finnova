import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { savingsGoalUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

function serialize<T extends { targetAmount: Prisma.Decimal; currentAmount: Prisma.Decimal }>(g: T) {
  return {
    ...g,
    targetAmount: g.targetAmount.toString(),
    currentAmount: g.currentAmount.toString(),
  };
}

export async function PATCH(req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = savingsGoalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: Prisma.SavingsGoalUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.targetAmount !== undefined)
    data.targetAmount = new Prisma.Decimal(parsed.data.targetAmount);
  if (parsed.data.currentAmount !== undefined)
    data.currentAmount = new Prisma.Decimal(parsed.data.currentAmount);
  if (parsed.data.deadline !== undefined) data.deadline = parsed.data.deadline;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;
  if (parsed.data.icon !== undefined) data.icon = parsed.data.icon;

  if (parsed.data.contribute !== undefined) {
    const next = Number(existing.currentAmount) + parsed.data.contribute;
    data.currentAmount = new Prisma.Decimal(Math.max(0, next));
  }

  const goal = await prisma.savingsGoal.update({
    where: { id },
    data,
  });

  return NextResponse.json(serialize(goal));
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
