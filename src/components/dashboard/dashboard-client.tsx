"use client";

import ActivityChart from "./activity-chart";
import WorkerConsole from "./worker-console";
import ActivityFeed from "./activity-feed";
import { useDashboardData } from "./dashboard-data-provider";

export default function DashboardClient() {
  const { data, loading, error } = useDashboardData();

  return (
    <div className="space-y-8 p-8">

      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      {error ? <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div> : null}

      <ActivityChart
        points={data?.workforceActivity.spending ?? []}
        agentSpending={data?.workforceActivity.agentSpending ?? []}
        performance={data?.workforceActivity.performance ?? []}
        loading={loading}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <WorkerConsole items={data?.workforceActivity.events ?? []} loading={loading} />

        <ActivityFeed items={data?.workforceActivity.completedTasks ?? []} loading={loading} />
      </div>

    </div>
  );
}
