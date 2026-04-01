import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { budgetUpsertSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.budget.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = budgetUpsertSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...(data.year !== undefined ? { year: data.year } : {}),
      ...(data.month !== undefined ? { month: data.month } : {}),
      ...(data.limitAmount !== undefined
        ? { limitAmount: new Prisma.Decimal(data.limitAmount) }
        : {}),
      ...(data.categoryId
        ? {
            categoryId: data.categoryId,
          }
        : {}),
    },
    include: { category: true },
  });

  return NextResponse.json({
    ...budget,
    limitAmount: budget.limitAmount.toString(),
    category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.budget.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
