import DashboardLayout from "@/components/layout/dashboard-layout";
import { AgentsClient } from "@/components/agents/agents-client";
import { listMarketplaceAgents } from
  "@/modules/agents/application/list-marketplace-agents";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";

export default async function AgentsPage() {
  await requireCurrentUser();
  const agents = await listMarketplaceAgents();

  return (
    <DashboardLayout>
      <AgentsClient initialAgents={agents} />
    </DashboardLayout>
  );
}

