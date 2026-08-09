import { notFound } from "next/navigation";

import { EmployedAgentDetails } from "@/components/agents/employed-agent-details";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { getEmployedAgentDetails } from "@/modules/agents/application/get-employed-agent-details";
import { requireCurrentUser } from "@/modules/identity/application/current-user";

type Props = { params: Promise<{ id: string }> };

export default async function EmployedAgentPage({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireCurrentUser()]);
  const details = await getEmployedAgentDetails(user.id, id);
  if (!details) notFound();

  return (
    <DashboardLayout>
      <EmployedAgentDetails
        agent={details.agent}
        tasks={details.tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
        }))}
        schedules={details.schedules.map((schedule) => ({
          ...schedule,
          nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
          lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
        }))}
      />
    </DashboardLayout>
  );
}
