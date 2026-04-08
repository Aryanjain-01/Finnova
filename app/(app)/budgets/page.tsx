import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BudgetsPanel } from "@/components/budgets-panel";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const currency = "INR";

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Set monthly limits per expense category and compare to actual spending."
      />
      <BudgetsPanel currency={currency} />
    </div>
  );
}
