type TaskStats = {
  draft: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  manualReview: number;
};

export default function ActivityChart({ tasks }: { tasks: TaskStats }) {
  const values = [
    ["Pending", tasks.draft + tasks.queued],
    ["Running", tasks.running],
    ["Completed", tasks.completed],
    ["Failed", tasks.failed],
    ["Cancelled", tasks.cancelled],
    ["Review", tasks.manualReview],
  ] as const;
  const maximum = Math.max(1, ...values.map(([, value]) => value));
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Workforce Activity
      </h2>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {values.map(([label, value]) => (
          <div key={label} className="flex min-h-36 flex-col justify-end rounded-lg bg-zinc-950 p-3">
            <div className="mb-3 rounded bg-violet-600/70" style={{ height: `${Math.max(4, value / maximum * 80)}px` }} />
            <p className="text-xl font-semibold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
