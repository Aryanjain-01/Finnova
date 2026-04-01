import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { accountUpdateSchema } from "@/lib/validations";
import { computeAccountBalances } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const account = await prisma.account.findFirst({
    where: { id, userId: r.userId },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { balances } = await computeAccountBalances(r.userId);
  return NextResponse.json({ ...account, balance: balances.get(account.id) ?? 0 });
}

export async function PATCH(req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.account.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const account = await prisma.account.update({
    where: { id },
    data: parsed.data,
  });

  const { balances } = await computeAccountBalances(r.userId);
  return NextResponse.json({ ...account, balance: balances.get(account.id) ?? 0 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const { id } = await params;

  const existing = await prisma.account.findFirst({
    where: { id, userId: r.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
