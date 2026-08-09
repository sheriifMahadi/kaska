"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArrowLeft, CalendarClock, CircleDollarSign, Play } from "lucide-react";

import { TaskList } from "@/components/tasks/task-list";
import { AgentSchedules } from "./agent-schedules";

type Agent = {
  userAgentId: string;
  name: string;
  description: string;
  capabilities: string[];
  price: string;
  totalSpent: string | null;
  supportsOneTime: boolean;
  supportsRecurring: boolean;
};

type Job = {
  id: string;
  title: string;
  status: string;
  workflowState: string;
  agentName: string;
  createdAt: string;
};

type Schedule = {
  id: string;
  name: string;
  status: "active" | "paused" | "auto_paused" | "completed" | "cancelled";
  intervalMinutes: number;
  spendingLimit: string;
  spentAmount: string;
  runCount: number;
  timezone: string;
  nextRunAt: string | null;
};


export function EmployedAgentDetails({
  agent,
  tasks,
  schedules,
}: {
  agent: Agent;
  tasks: Job[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archiveAgent() {
    if (!window.confirm("Archive this agent? It will be removed from Jobs, but its job history will remain stored.")) return;
    setArchiving(true);
    setError(null);
    try {
      const response = await fetch("/api/user-agents/" + agent.userAgentId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not archive agent");
      router.push("/jobs");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not archive agent");
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
        <ArrowLeft size={16} /> Back
      </Link>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
            <p className="mt-3 leading-7 text-zinc-400">{agent.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <span key={capability} className="rounded-md border border-zinc-800 bg-black px-2.5 py-1 text-xs text-zinc-500">
                  {capability.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={"/jobs/new?agent=" + agent.userAgentId} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-500">
              <Play size={16} /> Run agent
            </Link>
            <button type="button" disabled={archiving} onClick={archiveAgent} aria-label="Archive agent" title="Archive agent" className="rounded-lg border border-red-900/60 px-3 text-red-500/70 transition hover:border-red-700 hover:bg-red-950/20 hover:text-red-400 disabled:opacity-50">
              <Archive size={17} />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat icon={<CircleDollarSign size={17} />} label="Total spent" value={(agent.totalSpent ?? "0") + " USDC"} />
          <Stat icon={<CircleDollarSign size={17} />} label="Price per run" value={agent.price + " USDC"} />
          <Stat icon={<CalendarClock size={17} />} label="Work modes" value={[agent.supportsOneTime && "One-time", agent.supportsRecurring && "Recurring"].filter(Boolean).join(" · ")} />
        </div>
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </section>

      <AgentSchedules schedules={schedules} agentId={agent.userAgentId} />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Job history</h2><p className="mt-1 text-sm text-zinc-500">All work completed or attempted by this agent.</p></div>
          <span className="text-sm text-zinc-600">{tasks.length} total</span>
        </div>
        <TaskList
          tasks={tasks}
          returnToAgentId={agent.userAgentId}
          pageSize={5}
        />
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-900 bg-black p-4"><span className="flex items-center gap-2 text-xs text-zinc-600">{icon}{label}</span><span className="mt-2 block font-medium text-zinc-200">{value}</span></div>;
}
