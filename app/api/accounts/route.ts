import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { accountCreateSchema } from "@/lib/validations";
import { computeAccountBalances } from "@/lib/finance";

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const { accounts, balances } = await computeAccountBalances(r.userId);
  return NextResponse.json(
    accounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.name,
      type: a.type,
      currency: a.currency,
      archived: a.archived,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      balance: balances.get(a.id) ?? 0,
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

  const parsed = accountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const account = await prisma.account.create({
    data: {
      userId: r.userId,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency ?? "INR",
    },
  });

  return NextResponse.json({ ...account, balance: 0 });
}
