import { ListLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Item = {
  id: string;
  targetId: string;
  kind: "task" | "payment" | "schedule" | "transaction";
  title: string;
  status: string;
  agentName: string | null;
  eventType: string;
  occurredAt: string;
};

export default function WorkerConsole({ items, loading }: { items: Item[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-inner">
      <div className="flex h-8 items-center gap-1.5 border-b border-zinc-900 bg-zinc-950 px-4" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-red-500/60" />
        <span className="h-2 w-2 rounded-full bg-amber-400/60" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
      </div>
      <div className="h-72 overflow-y-auto p-4 font-mono [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? <ListLoadingSkeleton rows={3} /> : items.length === 0 ? <p className="text-sm text-zinc-500">No workforce activity yet.</p> : items.map((item) => (
          <div key={`${item.eventType}-${item.id}-${item.status}`} className="mb-2 flex min-w-0 items-start gap-2 text-xs leading-5">
            <span className="shrink-0 text-zinc-700">[{formatTime(item.occurredAt)}]</span>
            <span className={item.status === "failed" ? "text-red-400" : item.status === "completed" ? "text-emerald-400" : "text-amber-200/70"}>&gt;</span>
            <p className="min-w-0">
              <span className={item.status === "failed" ? "text-red-400" : item.status === "completed" ? "text-emerald-400" : "text-amber-200/70"}>{eventText(item)}</span>
              <span className="text-zinc-600"> — {item.title}</span>
            </p>
          </div>
        ))}
        {!loading ? <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500/70"><span>$</span><span className="inline-block h-3.5 w-1.5 animate-pulse bg-emerald-500/70" /></div> : null}
      </div>
    </div>
  );
}

function eventText(item: Item) {
  const agent = item.agentName ?? "Agent";
  const status = words(item.status);

  if (item.eventType === "task_started") return `${agent} started`;
  if (item.eventType === "task_finished") return `${agent} ${item.status === "completed" ? "completed work" : status}`;
  if (item.eventType === "task_state") return item.status === "manual_review" ? "Task needs manual review" : `Task ${status}`;
  if (item.eventType === "schedule_state") return `Schedule — ${status}`;
  if (item.eventType === "schedule_occurrence") {
    return item.status === "task_created" ? "Schedule created a task" : `Schedule — ${status}`;
  }
  if (item.kind === "transaction") return `${words(item.eventType)} — ${status}`;

  const paymentLabels: Record<string, string> = {
    approval: "USDC approval",
    escrow: "Funds locking",
    charge: "Task charge",
    refund: "Refund",
  };
  return `${paymentLabels[item.eventType] ?? "Payment"} — ${status}`;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function formatTime(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)); }
