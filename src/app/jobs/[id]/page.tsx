import DashboardLayout from "@/components/layout/dashboard-layout";
import { TaskDetailsClient } from "@/components/tasks/task-details-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromAgent?: string }>;
};

export default async function JobPage({ params, searchParams }: Props) {
  const [{ id }, { fromAgent }] = await Promise.all([params, searchParams]);
  return (
    <DashboardLayout>
      <TaskDetailsClient taskId={id} returnToAgentId={fromAgent} />
    </DashboardLayout>
  );
}
