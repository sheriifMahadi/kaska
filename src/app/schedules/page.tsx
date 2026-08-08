import DashboardLayout from "@/components/layout/dashboard-layout";
import { SchedulesClient } from "@/components/schedules/schedules-client";

export default function SchedulesPage() {
  return (
    <DashboardLayout>
      <SchedulesClient />
    </DashboardLayout>
  );
}
