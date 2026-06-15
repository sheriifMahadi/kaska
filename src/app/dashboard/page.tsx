

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/shared/stat-card";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  console.log("Dashboard user:", userId);

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active Workers" value="0" />
        <StatCard title="Tasks Completed" value="0" />
        <StatCard title="Balance" value="$0" />
        <StatCard title="Monthly Spend" value="$0" />
      </div>
    </DashboardLayout>
  );
}