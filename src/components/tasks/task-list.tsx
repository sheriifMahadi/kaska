import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: string;
  workflowState?: string;
  agentName: string;
  createdAt: string;
};

const colors: Record<string, string> = {
  queued: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-zinc-500",
  DRAFT: "bg-zinc-600",
  ESCROW_PENDING: "bg-amber-500",
  ESCROW_FAILED: "bg-red-500",
  FUNDS_LOCKED: "bg-violet-500",
  QUEUED: "bg-yellow-500",
  RUNNING: "bg-blue-500",
  EXECUTION_SUCCEEDED: "bg-green-500",
  EXECUTION_FAILED: "bg-red-500",
  CANCELLED: "bg-zinc-500",
  CHARGE_PENDING: "bg-amber-500",
  CHARGED: "bg-green-500",
  REFUND_PENDING: "bg-amber-500",
  REFUNDED: "bg-zinc-500",
  MANUAL_REVIEW: "bg-red-700",
};

export function TaskList({
  tasks,
}: {
  tasks: Task[];
}) {
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
        No tasks yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const displayStatus = task.workflowState ?? task.status;
        return (
        <Link
          key={task.id}
          href={`/tasks/${task.id}`}
          className="block"
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">
                  {task.title}
                </h3>

                <p className="text-sm text-zinc-500">
                  {task.agentName}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs text-white ${
                  colors[displayStatus] ?? "bg-zinc-600"
                }`}
              >
                {displayStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </Link>
        );
      })}
    </div>
  );
}
