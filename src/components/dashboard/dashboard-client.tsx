import ActivityChart from "./activity-chart";
import WorkerConsole from "./worker-console";
import ActivityFeed from "./activity-feed";
import type { DashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";

export default function DashboardClient({ data }: { data: DashboardProjection }) {
  return (
    <div className="space-y-8 p-8">

      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active agents" value={data.workforce.activeAgents} />
        <Stat label="Active schedules" value={data.workforce.recurringJobs.active} />
        <Stat label="Running tasks" value={data.tasks.running} />
        <Stat label="Charged" value={`${data.spending.chargedUsdc} USDC`} />
      </div>

      <ActivityChart tasks={data.tasks} />

      <div className="grid gap-8 lg:grid-cols-2">
        <WorkerConsole tasks={data.recent.tasks} />

        <ActivityFeed transactions={data.recent.transactions} />
      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
