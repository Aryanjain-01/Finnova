import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AccountsPanel } from "@/components/accounts-panel";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const currency = "INR";

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Balances are computed from your transactions (income, expenses, and transfers)."
      />
      <AccountsPanel currency={currency} />
    </div>
  );
}
