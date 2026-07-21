import ActivityChart from "./activity-chart";
import WorkerConsole from "./worker-console";
import ActivityFeed from "./activity-feed";

export default function DashboardClient() {
  return (
    <div className="space-y-8 p-8">

      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <ActivityChart />

      <div className="grid gap-8 lg:grid-cols-2">
        <WorkerConsole />

        <ActivityFeed />
      </div>

    </div>
  );
}