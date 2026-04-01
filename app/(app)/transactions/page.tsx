import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TransactionsPanel } from "@/components/transactions-panel";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  });
  const currency = user?.currency ?? "USD";

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="View, filter, and manage income, expenses, and transfers."
      />
      <TransactionsPanel currency={currency} />
    </div>
  );
}
