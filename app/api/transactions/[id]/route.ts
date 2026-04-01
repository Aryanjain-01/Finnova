import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { transactionUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nextType = parsed.data.type ?? existing.type;
  const nextTo = parsed.data.toAccountId !== undefined ? parsed.data.toAccountId : existing.toAccountId;
  const nextCat = parsed.data.categoryId !== undefined ? parsed.data.categoryId : existing.categoryId;

  if (parsed.data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, userId: r.userId },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });
  }
  if (nextType === "TRANSFER" && nextTo) {
    const toAcc = await prisma.account.findFirst({
      where: { id: nextTo, userId: r.userId },
    });
    if (!toAcc) return NextResponse.json({ error: "Destination account not found" }, { status: 400 });
  }
  if (nextCat) {
    const cat = await prisma.category.findFirst({
      where: { id: nextCat, userId: r.userId },
    });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    if (nextType === "INCOME" && cat.type !== "INCOME") {
      return NextResponse.json({ error: "Category must be an income category" }, { status: 400 });
    }
    if (nextType === "EXPENSE" && cat.type !== "EXPENSE") {
      return NextResponse.json({ error: "Category must be an expense category" }, { status: 400 });
    }
  }

  if (nextType === "TRANSFER" && !nextTo) {
    return NextResponse.json(
      { error: "Destination account is required for transfers" },
      { status: 400 },
    );
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(parsed.data.accountId ? { accountId: parsed.data.accountId } : {}),
      ...(parsed.data.toAccountId !== undefined
        ? { toAccountId: nextType === "TRANSFER" ? parsed.data.toAccountId : null }
        : {}),
      ...(parsed.data.categoryId !== undefined
        ? {
            categoryId:
              nextType === "TRANSFER" ? null : parsed.data.categoryId,
          }
        : {}),
      ...(parsed.data.amount !== undefined
        ? { amount: new Prisma.Decimal(parsed.data.amount) }
        : {}),
      ...(parsed.data.type ? { type: parsed.data.type } : {}),
      ...(parsed.data.date ? { date: parsed.data.date } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
    },
    include: { account: true, toAccount: true, category: true },
  });

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
    account: { id: updated.account.id, name: updated.account.name },
    toAccount: updated.toAccount
      ? { id: updated.toAccount.id, name: updated.toAccount.name }
      : null,
    category: updated.category
      ? {
          id: updated.category.id,
          name: updated.category.name,
          type: updated.category.type,
        }
      : null,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
