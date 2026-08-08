"use client";

import { useEffect, useState } from "react";
import ActivityChart from "./activity-chart";
import WorkerConsole from "./worker-console";
import ActivityFeed from "./activity-feed";

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load dashboard");
        setData(body);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setError(reason.message);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-8 p-8">

      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      {error ? <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div> : null}

      <ActivityChart points={data?.workforceActivity.spending ?? []} loading={!data && !error} />

      <div className="grid gap-8 lg:grid-cols-2">
        <WorkerConsole items={data?.workforceActivity.events ?? []} loading={!data && !error} />

        <ActivityFeed items={data?.workforceActivity.completedTasks ?? []} loading={!data && !error} />
      </div>

    </div>
  );
}

type DashboardData = {
  workforceActivity: {
    spending: Array<{ date: string; amount: string }>;
    events: Array<{ id: string; kind: "task" | "schedule"; title: string; status: string; agentName: string; occurredAt: string }>;
    completedTasks: Array<{ id: string; title: string; agentName: string; completedAt: string | null; amount: string | null }>;
  };
};
