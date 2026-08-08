import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { getCurrentDashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const projection = await getCurrentDashboardProjection();
  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      <Sidebar summary={{
        committedUsdc: projection.wallet.committedUsdc,
        activeAgents: projection.workforce.activeAgents,
      }} />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
