import DashboardLayout from "@/components/layout/dashboard-layout";
import { TasksClient } from "@/components/tasks/tasks-client";

export default function JobsPage() {
  return <DashboardLayout><TasksClient /></DashboardLayout>;
}
