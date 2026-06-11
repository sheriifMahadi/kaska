import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/shared/stat-card";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  const currentUser = user[0];

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