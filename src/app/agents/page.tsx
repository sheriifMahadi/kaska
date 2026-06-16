import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AgentsClient } from "@/components/agents/agents-client";

export default function AgentsPage() {
  return (
    <DashboardLayout>
      <AgentsClient />
    </DashboardLayout>
  );
}