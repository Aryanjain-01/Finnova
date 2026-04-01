import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { budgetUpsertSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const where = {
    userId: r.userId,
    ...(year && month
      ? { year: Number(year), month: Number(month) }
      : {}),
  };

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { category: { name: "asc" } }],
  });

  return NextResponse.json(
    budgets.map((b) => ({
      ...b,
      limitAmount: b.limitAmount.toString(),
      category: { id: b.category.id, name: b.category.name, type: b.category.type },
    })),
  );
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

  const parsed = budgetUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cat = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId: r.userId, type: "EXPENSE" },
  });
  if (!cat) {
    return NextResponse.json(
      { error: "Expense category not found" },
      { status: 400 },
    );
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_year_month: {
        userId: r.userId,
        categoryId: parsed.data.categoryId,
        year: parsed.data.year,
        month: parsed.data.month,
      },
    },
    create: {
      userId: r.userId,
      categoryId: parsed.data.categoryId,
      year: parsed.data.year,
      month: parsed.data.month,
      limitAmount: new Prisma.Decimal(parsed.data.limitAmount),
    },
    update: {
      limitAmount: new Prisma.Decimal(parsed.data.limitAmount),
    },
    include: { category: true },
  });

  return NextResponse.json({
    ...budget,
    limitAmount: budget.limitAmount.toString(),
    category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
  });
}
