import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardClient from "@/components/dashboard/dashboard-client";
import { getCurrentDashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";

export default async function DashboardPage() {
  const projection = await getCurrentDashboardProjection();
  return (
    <DashboardLayout>
      <DashboardClient data={projection} />
    </DashboardLayout>
  );
}
