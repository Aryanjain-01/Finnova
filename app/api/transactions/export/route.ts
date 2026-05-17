import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const r = await requireUserId();
  if ("response" in r) return r.response;

  const rows = await prisma.transaction.findMany({
    where: { userId: r.userId },
    include: { account: true, toAccount: true, category: true },
    orderBy: { date: "desc" },
  });

  const header = [
    "date",
    "type",
    "amount",
    "splitEnabled",
    "splitTotalAmount",
    "splitParticipants",
    "splitPaidAmount",
    "account",
    "toAccount",
    "category",
    "notes",
    "tags",
  ];
  const lines: string[] = [header.join(",")];

  for (const t of rows) {
    const tx = t as any;
    const row = [
      new Date(tx.date).toISOString().slice(0, 10),
      tx.type,
      tx.amount.toString(),
      tx.splitEnabled ? "true" : "false",
      tx.splitTotalAmount?.toString() ?? "",
      tx.splitParticipants?.toString() ?? "",
      tx.splitPaidAmount?.toString() ?? "",
      tx.account.name,
      tx.toAccount?.name ?? "",
      tx.category?.name ?? "",
      tx.notes ?? "",
      tx.tags ?? "",
    ].map(csvEscape);
    lines.push(row.join(","));
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="finnova-transactions.csv"',
    },
  });
}
