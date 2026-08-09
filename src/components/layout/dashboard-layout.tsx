import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { DashboardDataProvider } from
  "@/components/dashboard/dashboard-data-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardDataProvider>
      <div className="flex min-h-screen bg-[#050505] text-white">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-y-auto pt-16 md:pt-0">
          {children}
        </main>
      </div>
    </DashboardDataProvider>
  );
}
