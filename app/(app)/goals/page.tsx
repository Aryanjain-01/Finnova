import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsPanel } from "@/components/goals-panel";
import { TargetIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const currency = "INR";

  return (
    <div>
      <PageHeader
        eyebrow="Savings"
        title="Goals"
        description="Set targets, track contributions, and celebrate every milestone on the way."
        icon={<TargetIcon className="h-5 w-5" />}
      />
      <GoalsPanel currency={currency} />
    </div>
  );
}
