"use client";

import ActivityChart from "./activity-chart";
import WorkerConsole from "./worker-console";
import ActivityFeed from "./activity-feed";
import { useDashboardData } from "./dashboard-data-provider";

export default function DashboardClient() {
  const { data, loading, error, refresh } = useDashboardData();

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">

      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
          <span>{data ? "Some dashboard data could not be refreshed." : error}</span>
          <button type="button" onClick={refresh} className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium hover:bg-red-950">
            Try again
          </button>
        </div>
      ) : null}

      <ActivityChart
        points={data?.workforceActivity.spending ?? []}
        agentSpending={data?.workforceActivity.agentSpending ?? []}
        performance={data?.workforceActivity.performance ?? []}
        loading={loading}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <WorkerConsole items={data?.workforceActivity.events ?? []} loading={loading} />

        <ActivityFeed items={data?.workforceActivity.recentActivity ?? []} loading={loading} />
      </div>

    </div>
  );
}
