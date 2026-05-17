import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { computeNextRunDate } from "@/lib/recurrence";

export const dynamic = "force-dynamic";

async function materialize(userId: string) {
  const now = new Date();
  const due = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      active: true,
      nextRunDate: { lte: now },
    },
  });

  const createdIds: string[] = [];

  for (const rec of due) {
    let next = new Date(rec.nextRunDate);
    let guard = 0;
    while (next.getTime() <= now.getTime() && guard < 120) {
      if (rec.endDate && next.getTime() > rec.endDate.getTime()) break;

      const tx = await prisma.transaction.create({
        data: {
          userId,
          accountId: rec.accountId,
          categoryId: rec.categoryId,
          amount: rec.amount,
          type: rec.type,
          date: next,
          notes: rec.notes ? `[auto] ${rec.notes}` : "[auto] recurring",
        },
      });
      createdIds.push(tx.id);
      next = computeNextRunDate(next, rec.frequency);
      guard++;
    }

    await prisma.recurringTransaction.update({
      where: { id: rec.id },
      data: {
        nextRunDate: next,
        active:
          rec.endDate && next.getTime() > rec.endDate.getTime() ? false : rec.active,
      },
    });
  }

  return { ranCount: createdIds.length, createdIds };
}

export async function POST() {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const result = await materialize(r.userId);
  return NextResponse.json(result);
}

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;
  const result = await materialize(r.userId);
  return NextResponse.json(result);
}
