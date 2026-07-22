import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: string;
  agentName: string;
  createdAt: string;
};

const colors: Record<string, string> = {
  queued: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
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
      {tasks.map((task) => (
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
                  colors[task.status]
                }`}
              >
                {task.status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}