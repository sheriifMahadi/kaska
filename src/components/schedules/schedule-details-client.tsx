"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, CircleDollarSign, Clock3 } from "lucide-react";

import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Occurrence = {
  id: string;
  scheduledFor: string;
  status: string;
  reason: string | null;
  taskId: string | null;
  taskStatus: string | null;
  paymentStatus: string | null;
};

type Schedule = {
  job: {
    id: string;
    name: string;
    instructions: string;
    status: "active" | "paused" | "auto_paused" | "completed" | "cancelled";
    intervalMinutes: number;
    pricePerRun: string;
    spendingLimit: string;
    spentAmount: string;
    runCount: number;
    consecutiveFailures: number;
    missedRunCount: number;
    timezone: string;
    nextRunAt: string | null;
    lastRunAt: string | null;
    statusReason: string | null;
  };
  agentName: string;
  occurrences: Occurrence[];
};

export function ScheduleDetailsClient({ scheduleId }: { scheduleId: string }) {
  const [data, setData] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/recurring-jobs/" + scheduleId);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load schedule");
      setData(body);
      setLimit(body.job.spendingLimit);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function update(body: { status?: string; spendingLimit?: string }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/recurring-jobs/" + scheduleId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update schedule");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update schedule");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoadingSkeleton cards={3} />;
  if (!data) return <div className="p-8 text-red-400">{error ?? "Schedule not found."}</div>;

  const { job } = data;
  const terminal = job.status === "cancelled" || job.status === "completed";
  const jobs = data.occurrences.filter((occurrence) => occurrence.taskId);

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8">
      <Link href="/schedules" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft size={16} /> Back</Link>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{job.name}</h1><span className="text-sm capitalize text-zinc-500">{job.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-zinc-500">{data.agentName}</p></div>
          {!terminal ? <div className="flex gap-2">{job.status === "active" ? <button disabled={saving} onClick={() => update({ status: "paused" })} className={secondaryButton}>Pause</button> : <button disabled={saving} onClick={() => update({ status: "active", spendingLimit: limit })} className="rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50">Resume</button>}<button disabled={saving} onClick={() => window.confirm("Cancel this schedule permanently?") && update({ status: "cancelled" })} className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-400 disabled:opacity-50">Cancel</button></div> : null}
        </div>
        {job.statusReason ? <p className="mt-4 rounded-lg bg-amber-950/20 p-3 text-sm text-amber-300">{job.statusReason}</p> : null}
        <p className="mt-6 whitespace-pre-wrap leading-7 text-zinc-300">{job.instructions}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Clock3 size={16} />} label="Interval" value={formatInterval(job.intervalMinutes)} />
          <Stat icon={<CircleDollarSign size={16} />} label="Spent" value={job.spentAmount + " / " + job.spendingLimit + " USDC"} />
          <Stat icon={<CalendarClock size={16} />} label="Next run" value={job.nextRunAt ? formatDate(job.nextRunAt, job.timezone) : "None"} />
          <Stat icon={<CalendarClock size={16} />} label="Runs created" value={String(job.runCount)} />
        </div>
        {!terminal ? <div className="mt-5 flex flex-wrap items-end gap-2"><label className="space-y-2"><span className="block text-xs text-zinc-500">Increase total limit</span><input value={limit} onChange={(event) => setLimit(event.target.value)} className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-500" /></label><button disabled={saving || limit === job.spendingLimit} onClick={() => update({ spendingLimit: limit })} className={secondaryButton}>Save</button></div> : null}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </section>

      <section>
        <div className="mb-4"><h2 className="text-xl font-semibold">Jobs created by this schedule</h2><p className="mt-1 text-sm text-zinc-500">Each scheduled execution appears as its own job.</p></div>
        {jobs.length === 0 ? <div className="rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">No jobs have run yet.</div> : <div className="space-y-3">{jobs.map((occurrence) => <Link key={occurrence.id} href={"/jobs/" + occurrence.taskId + "?fromSchedule=" + scheduleId} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"><div><p className="text-sm font-medium text-zinc-200">{formatDate(occurrence.scheduledFor, job.timezone)}</p><p className="mt-1 text-xs text-zinc-600">Execution: {occurrence.taskStatus ?? occurrence.status} · Payment: {occurrence.paymentStatus ?? "not started"}</p></div><span className="text-zinc-700">›</span></Link>)}</div>}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-zinc-900 bg-black p-4"><span className="flex items-center gap-2 text-xs text-zinc-600">{icon}{label}</span><span className="mt-2 block text-sm font-medium text-zinc-200">{value}</span></div>; }
function formatInterval(minutes: number) { if (minutes % 1440 === 0) return `${minutes / 1440} day(s)`; if (minutes % 60 === 0) return `${minutes / 60} hour(s)`; return `${minutes} minute(s)`; }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
const secondaryButton = "rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50";
