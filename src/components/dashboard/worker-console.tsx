import Link from "next/link";

type Item = { id: string; kind: "task" | "schedule"; title: string; status: string; agentName: string; occurredAt: string };

export default function WorkerConsole({ items, loading }: { items: Item[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
      <div className="h-72 space-y-3 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? <p className="text-sm text-zinc-500">Loading workforce activity...</p> : items.length === 0 ? <p className="text-sm text-zinc-500">No workforce activity yet.</p> : items.map((item) => (
          <Link key={`${item.kind}-${item.id}`} href={item.kind === "task" ? `/tasks/${item.id}` : "/schedules"} className="block rounded-lg border border-zinc-900 bg-zinc-950 p-3 hover:border-violet-900">
            <div className="flex items-center justify-between gap-3"><p className="font-medium text-zinc-100">{eventText(item)}</p><span className="text-xs text-zinc-600">{formatDate(item.occurredAt)}</span></div>
            <p className="mt-1 truncate text-sm text-zinc-400">{item.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function eventText(item: Item) {
  if (item.kind === "schedule") return `Schedule — ${item.status.replace("_", " ")}`;
  if (item.status === "running") return `${item.agentName} started`;
  if (item.status === "queued") return `${item.agentName} queued`;
  if (item.status === "completed") return `${item.agentName} completed work`;
  if (item.status === "failed") return `${item.agentName} failed`;
  if (item.status === "cancelled") return `${item.agentName} task cancelled`;
  return `${item.agentName} activating`;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
