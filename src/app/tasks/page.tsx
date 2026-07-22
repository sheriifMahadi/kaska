import DashboardLayout from "@/components/layout/dashboard-layout";
import { TasksClient } from "@/components/tasks/tasks-client";

export default function TasksPage() {
  return (
    <DashboardLayout>
      <TasksClient />
    </DashboardLayout>
  );
}