import DashboardLayout from "@/components/layout/dashboard-layout";
import { RunTaskClient } from "@/components/tasks/run-task-client";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RunTaskPage({ params }: Props) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <RunTaskClient userAgentId={id} />
    </DashboardLayout>
  );
}