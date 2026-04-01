import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { transactionCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type") as "INCOME" | "EXPENSE" | "TRANSFER" | null;
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  const where: Prisma.TransactionWhereInput = { userId: r.userId };

  if (type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
    where.type = type;
  }
  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = new Prisma.Decimal(minAmount);
    if (maxAmount) where.amount.lte = new Prisma.Decimal(maxAmount);
  }
  if (q) {
    where.OR = [
      { notes: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { account: true, toAccount: true, category: true },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: rows.map((t) => ({
      ...t,
      amount: t.amount.toString(),
      account: { id: t.account.id, name: t.account.name },
      toAccount: t.toAccount ? { id: t.toAccount.id, name: t.toAccount.name } : null,
      category: t.category
        ? { id: t.category.id, name: t.category.name, type: t.category.type }
        : null,
    })),
  });
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

  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: r.userId },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 });
  }

  if (data.type === "TRANSFER") {
    const toAcc = await prisma.account.findFirst({
      where: { id: data.toAccountId!, userId: r.userId },
    });
    if (!toAcc) {
      return NextResponse.json({ error: "Destination account not found" }, { status: 400 });
    }
  }

  if (data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: r.userId },
    });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    if (data.type === "INCOME" && cat.type !== "INCOME") {
      return NextResponse.json({ error: "Category must be an income category" }, { status: 400 });
    }
    if (data.type === "EXPENSE" && cat.type !== "EXPENSE") {
      return NextResponse.json({ error: "Category must be an expense category" }, { status: 400 });
    }
  }

  const created = await prisma.transaction.create({
    data: {
      userId: r.userId,
      accountId: data.accountId,
      toAccountId: data.type === "TRANSFER" ? data.toAccountId : null,
      categoryId:
        data.type === "TRANSFER"
          ? null
          : data.categoryId ?? null,
      amount: new Prisma.Decimal(data.amount),
      type: data.type,
      date: data.date,
      notes: data.notes ?? null,
      tags: data.tags ?? null,
    },
    include: { account: true, toAccount: true, category: true },
  });

  return NextResponse.json({
    ...created,
    amount: created.amount.toString(),
    account: { id: created.account.id, name: created.account.name },
    toAccount: created.toAccount
      ? { id: created.toAccount.id, name: created.toAccount.name }
      : null,
    category: created.category
      ? {
          id: created.category.id,
          name: created.category.name,
          type: created.category.type,
        }
      : null,
  });
}
