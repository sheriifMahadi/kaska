import DashboardLayout from "@/components/layout/dashboard-layout";
import { RunTaskClient } from "@/components/tasks/run-task-client";

type Props = {
  searchParams: Promise<{
    agent?: string;
  }>;
};

export default async function NewTaskPage({
  searchParams,
}: Props) {
  const { agent } = await searchParams;

  return (
    <DashboardLayout>
      <RunTaskClient userAgentId={agent ?? ""} />
    </DashboardLayout>
  );
}