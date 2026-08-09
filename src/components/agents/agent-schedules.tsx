"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type ScheduleSummary = {
  id: string;
  name: string;
  status: "active" | "paused" | "auto_paused" | "completed" | "cancelled";
  intervalMinutes: number;
  spendingLimit: string;
  spentAmount: string;
  runCount: number;
  timezone: string;
  nextRunAt: string | null;
  userAgentId?: string;
  agentName?: string;
};

type Occurrence = {
  id: string;
  scheduledFor: string;
  status: string;
  taskId: string | null;
  taskStatus: string | null;
  paymentStatus: string | null;
};

type ScheduleDetails = {
  job: ScheduleSummary & {
    instructions: string;
    pricePerRun: string;
    statusReason: string | null;
  };
  occurrences: Occurrence[];
};

export function AgentSchedules({
  schedules,
  agentId,
}: {
  schedules: ScheduleSummary[];
  agentId?: string;
}) {
  const [items, setItems] = useState(schedules);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ScheduleDetails>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      schedules.map((schedule) => [schedule.id, schedule.spendingLimit])
    )
  );

  async function toggle(id: string) {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (details[id]) return;
    try {
      const response = await fetch("/api/recurring-jobs/" + id);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load recurring job");
      setDetails((current) => ({ ...current, [id]: body }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load recurring job");
    }
  }

  async function update(id: string, body: Record<string, string>) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch("/api/recurring-jobs/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update recurring job");
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: result.status, spendingLimit: result.spendingLimit, nextRunAt: result.nextRunAt }
            : item
        )
      );
      setDetails((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setOpenId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update recurring job");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Recurring work</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Expand a recurring job to manage it and see the jobs it created.
        </p>
      </div>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-500">
          This agent has no recurring work.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((schedule) => {
            const open = openId === schedule.id;
            const loaded = details[schedule.id];
            const terminal = schedule.status === "cancelled" || schedule.status === "completed";
            return (
              <article key={schedule.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                <button type="button" onClick={() => toggle(schedule.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-medium text-zinc-100">{schedule.name}</h3><span className="text-xs capitalize text-zinc-600">{schedule.status.replaceAll("_", " ")}</span></div>{schedule.agentName ? <p className="mt-1 text-xs text-zinc-500">{schedule.agentName}</p> : null}<p className="mt-1 text-xs text-zinc-500">Every {formatInterval(schedule.intervalMinutes)} · {schedule.spentAmount} / {schedule.spendingLimit} USDC · {schedule.runCount} runs</p></div>
                  <ChevronDown size={17} className={`shrink-0 text-zinc-600 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <div className="border-t border-zinc-800 p-4">
                    {!loaded ? <div className="h-24 animate-pulse rounded-lg bg-zinc-900" /> : (
                      <div className="space-y-5">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">{loaded.job.instructions}</p>
                        {!terminal ? <div className="flex flex-wrap gap-2">{schedule.status === "active" ? <button disabled={busy === schedule.id} onClick={() => update(schedule.id, { status: "paused" })} className={buttonClass}>Pause</button> : <button disabled={busy === schedule.id} onClick={() => update(schedule.id, { status: "active", spendingLimit: schedule.spendingLimit })} className={buttonClass}>Resume</button>}<button disabled={busy === schedule.id} onClick={() => window.confirm("Cancel this recurring job permanently?") && update(schedule.id, { status: "cancelled" })} className="rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-400">Cancel</button></div> : null}
                        {!terminal ? <div className="flex flex-wrap items-end gap-2"><label className="space-y-1"><span className="block text-xs text-zinc-600">Total spending limit</span><input value={limits[schedule.id] ?? schedule.spendingLimit} onChange={(event) => setLimits((current) => ({ ...current, [schedule.id]: event.target.value }))} className="w-36 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-violet-500" /></label><button disabled={busy === schedule.id || limits[schedule.id] === schedule.spendingLimit} onClick={() => update(schedule.id, { spendingLimit: limits[schedule.id] })} className={buttonClass}>Save limit</button></div> : null}
                        <div><p className="mb-2 text-xs uppercase tracking-wider text-zinc-600">Jobs created</p><div className="space-y-2">{loaded.occurrences.filter((item) => item.taskId).length === 0 ? <p className="text-sm text-zinc-600">No jobs have run yet.</p> : loaded.occurrences.filter((item) => item.taskId).map((item) => <Link key={item.id} href={"/jobs/" + item.taskId + (agentId ? "?fromAgent=" + agentId : "")} className="flex items-center justify-between rounded-lg bg-zinc-900 p-3 text-sm"><span className="text-zinc-300">{formatDate(item.scheduledFor, schedule.timezone)}</span><span className="text-xs text-zinc-600">{item.taskStatus ?? item.status}</span></Link>)}</div></div>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatInterval(minutes: number) { if (minutes % 1440 === 0) return `${minutes / 1440} day(s)`; if (minutes % 60 === 0) return `${minutes / 60} hour(s)`; return `${minutes} minute(s)`; }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
const buttonClass = "rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-50";
