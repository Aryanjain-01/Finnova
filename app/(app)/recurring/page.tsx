import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { RecurringPanel } from "@/components/recurring-panel";
import { RepeatIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const currency = "INR";

  return (
    <div>
      <PageHeader
        eyebrow="Automation"
        title="Subscriptions & Bills"
        description="Track and automate your subscriptions, utilities, and recurring expenses."
        icon={<RepeatIcon className="h-5 w-5" />}
      />
      <RecurringPanel currency={currency} />
    </div>
  );
}
