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

  const header = ["date", "type", "amount", "account", "toAccount", "category", "notes", "tags"];
  const lines: string[] = [header.join(",")];

  for (const t of rows) {
    const row = [
      new Date(t.date).toISOString().slice(0, 10),
      t.type,
      t.amount.toString(),
      t.account.name,
      t.toAccount?.name ?? "",
      t.category?.name ?? "",
      t.notes ?? "",
      t.tags ?? "",
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
