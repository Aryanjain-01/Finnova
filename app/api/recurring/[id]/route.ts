import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { recurringUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = recurringUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: Prisma.RecurringTransactionUpdateInput = {};
  if (parsed.data.accountId !== undefined) {
    const acc = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, userId: r.userId },
    });
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 400 });
    data.account = { connect: { id: parsed.data.accountId } };
  }
  if (parsed.data.categoryId !== undefined) {
    data.category = parsed.data.categoryId
      ? { connect: { id: parsed.data.categoryId } }
      : { disconnect: true };
  }
  if (parsed.data.amount !== undefined) data.amount = new Prisma.Decimal(parsed.data.amount);
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.frequency !== undefined) data.frequency = parsed.data.frequency;
  if (parsed.data.startDate !== undefined) {
    data.startDate = parsed.data.startDate;
    data.nextRunDate = parsed.data.startDate;
  }
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data,
    include: { account: true, category: true },
  });

  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
