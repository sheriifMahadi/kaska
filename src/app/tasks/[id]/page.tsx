import DashboardLayout from "@/components/layout/dashboard-layout";
import { TaskDetailsClient } from "@/components/tasks/task-details-client";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <TaskDetailsClient taskId={id} />
    </DashboardLayout>
  );
}