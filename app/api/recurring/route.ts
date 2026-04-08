import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { recurringCreateSchema } from "@/lib/validations";

function serialize<
  T extends {
    amount: Prisma.Decimal;
    account: { id: string; name: string } | null;
    category: { id: string; name: string; type: string } | null;
  },
>(r: T) {
  return {
    ...r,
    amount: r.amount.toString(),
    account: r.account ? { id: r.account.id, name: r.account.name } : null,
    category: r.category
      ? { id: r.category.id, name: r.category.name, type: r.category.type }
      : null,
  };
}

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const rows = await prisma.recurringTransaction.findMany({
    where: { userId: r.userId },
    include: { account: true, category: true },
    orderBy: { nextRunDate: "asc" },
  });

  return NextResponse.json(rows.map(serialize));
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

  const parsed = recurringCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: r.userId },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });

  if (parsed.data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId: r.userId },
    });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    if (parsed.data.type === "INCOME" && cat.type !== "INCOME") {
      return NextResponse.json({ error: "Category must be INCOME" }, { status: 400 });
    }
    if (parsed.data.type === "EXPENSE" && cat.type !== "EXPENSE") {
      return NextResponse.json({ error: "Category must be EXPENSE" }, { status: 400 });
    }
  }

  const created = await prisma.recurringTransaction.create({
    data: {
      userId: r.userId,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId ?? null,
      amount: new Prisma.Decimal(parsed.data.amount),
      type: parsed.data.type,
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      nextRunDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      notes: parsed.data.notes ?? null,
      active: parsed.data.active ?? true,
    },
    include: { account: true, category: true },
  });

  return NextResponse.json(serialize(created));
}
