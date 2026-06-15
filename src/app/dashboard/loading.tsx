import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
