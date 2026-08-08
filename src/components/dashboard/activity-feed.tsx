import Link from "next/link";

type Item = { id: string; title: string; agentName: string; completedAt: string | null; amount: string | null };

export default function ActivityFeed({ items, loading }: { items: Item[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Recent Activity
      </h2>

      <div className="h-72 space-y-3 overflow-y-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? <p className="text-zinc-500">Loading completed tasks...</p> : items.length === 0 ? <p className="text-zinc-500">No completed tasks yet.</p> : items.map((item) => (
          <Link key={item.id} href={`/tasks/${item.id}`} className="flex items-start gap-3 rounded-lg border border-zinc-900 bg-zinc-950 p-3 hover:border-violet-900">
            <span className="mt-0.5 text-emerald-400">✓</span>
            <div className="min-w-0 flex-1"><p className="truncate text-zinc-100">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.agentName}{item.completedAt ? ` · ${formatDate(item.completedAt)}` : ""}{item.amount ? ` · ${item.amount} USDC` : ""}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
