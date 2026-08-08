import Link from "next/link";

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
    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
      <div className="h-72 space-y-3 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? <p className="text-sm text-zinc-500">Loading workforce activity...</p> : items.length === 0 ? <p className="text-sm text-zinc-500">No workforce activity yet.</p> : items.map((item) => (
          <Link key={`${item.eventType}-${item.id}-${item.status}`} href={eventHref(item)} className="block rounded-lg border border-zinc-900 bg-zinc-950 p-3 hover:border-violet-900">
            <div className="flex items-center justify-between gap-3"><p className="font-medium text-zinc-100">{eventText(item)}</p><span className="text-xs text-zinc-600">{formatDate(item.occurredAt)}</span></div>
            <p className="mt-1 truncate text-sm text-zinc-400">{item.title}</p>
          </Link>
        ))}
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

function eventHref(item: Item) {
  if (item.kind === "schedule") return "/schedules";
  if (item.kind === "transaction") return "/transactions";
  return `/tasks/${item.targetId}`;
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
