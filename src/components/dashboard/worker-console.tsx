type RecentTask = {
  id: string;
  title: string;
  status: string;
  agentName: string;
  amount: string | null;
  paymentStatus: string | null;
};

export default function WorkerConsole({ tasks }: { tasks: RecentTask[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Worker Console
      </h2>

      <div className="space-y-3 font-mono text-sm">
        {tasks.length === 0 ? <p className="text-zinc-500">No tasks yet.</p> : tasks.map((task) => (
          <div key={task.id} className="rounded-lg bg-zinc-950 p-3">
            <p className="text-purple-400">&gt; {task.agentName}: {task.title}</p>
            <p className="mt-1 text-zinc-500">{task.status} · payment {task.paymentStatus ?? "none"}{task.amount ? ` · ${task.amount} USDC` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
