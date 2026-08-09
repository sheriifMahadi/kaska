import Link from "next/link";
import { ListLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Item = { id: string; targetId: string; kind: "task" | "transaction"; title: string; subtitle: string; status: string; occurredAt: string };

export default function ActivityFeed({ items, loading }: { items: Item[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Recent Activity
      </h2>

      <div className="h-72 space-y-3 overflow-y-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? <ListLoadingSkeleton rows={3} /> : items.length === 0 ? <p className="text-zinc-500">No recent activity yet.</p> : items.map((item) => (
          <Link key={`${item.kind}-${item.id}`} href={item.kind === "task" ? `/jobs/${item.targetId}` : "/wallet"} className="flex items-start gap-3 rounded-lg border border-zinc-900 bg-zinc-950 p-3 hover:border-violet-900">
            <span className={`mt-0.5 ${item.status === "failed" ? "text-red-400" : "text-emerald-400"}`}>{item.status === "failed" ? "×" : "✓"}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-zinc-100">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.subtitle} · {formatDate(item.occurredAt)}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
