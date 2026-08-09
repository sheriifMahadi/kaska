"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Agent = {
  userAgentId: string;
  name: string;
  price: string;
  supportsRecurring: boolean;
};

type Job = {
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
  agentName: string;
};

type Occurrence = {
  id: string;
  scheduledFor: string;
  status: string;
  reason: string | null;
  taskId: string | null;
  taskStatus: string | null;
  paymentStatus: string | null;
};

export function SchedulesClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<Record<string, Occurrence[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    userAgentId: "",
    name: "",
    instructions: "",
    intervalMinutes: "60",
    spendingLimit: "",
    startsAt: "",
    endsAt: "",
  });

  const load = useCallback(async () => {
    try {
      const [jobsResponse, agentsResponse] = await Promise.all([
        fetch("/api/recurring-jobs"),
        fetch("/api/user-agents"),
      ]);
      const jobsData = await jobsResponse.json();
      const agentsData = await agentsResponse.json();
      if (!jobsResponse.ok) throw new Error(jobsData.error || "Could not load schedules");
      if (!agentsResponse.ok) throw new Error(agentsData.error || "Could not load agents");
      const recurringAgents = (agentsData as Agent[])
        .filter((agent) => agent.supportsRecurring);
      setJobs(jobsData);
      setAgents(recurringAgents);
      setForm((current) => ({
        ...current,
        userAgentId: current.userAgentId || recurringAgents[0]?.userAgentId || "",
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/recurring-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          intervalMinutes: Number(form.intervalMinutes),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create schedule");
      setForm((current) => ({
        ...current,
        name: "",
        instructions: "",
        spendingLimit: "",
        startsAt: "",
        endsAt: "",
      }));
      setMessage("Schedule created. It will run at the displayed next-run time.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create schedule");
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, body: Record<string, string>) {
    setMessage(null);
    const response = await fetch(`/api/recurring-jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Could not update schedule");
      return;
    }
    await load();
  }

  async function toggleHistory(id: string) {
    if (history[id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const response = await fetch(`/api/recurring-jobs/${id}`);
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not load run history");
    setHistory((current) => ({ ...current, [id]: data.occurrences }));
  }

  if (loading) return <PageLoadingSkeleton cards={3} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Recurring work</h1>
        <p className="mt-2 text-zinc-400">Choose how often an agent runs and the most it may spend in total.</p>
      </div>

      <form onSubmit={create} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-xl font-semibold text-white">Create a schedule</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-amber-400">Employ an agent that supports recurring work first.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Agent">
              <select value={form.userAgentId} onChange={(event) => setForm({ ...form, userAgentId: event.target.value })} className={controlClass}>
                {agents.map((agent) => <option key={agent.userAgentId} value={agent.userAgentId}>{agent.name} — {agent.price} USDC/run</option>)}
              </select>
            </Field>
            <Field label="Schedule name"><input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={controlClass} /></Field>
            <Field label="Run every (minutes)"><input required type="number" min="1" max="43200" value={form.intervalMinutes} onChange={(event) => setForm({ ...form, intervalMinutes: event.target.value })} className={controlClass} /></Field>
            <Field label="Total spending limit (USDC)"><input required inputMode="decimal" placeholder="5.00" value={form.spendingLimit} onChange={(event) => setForm({ ...form, spendingLimit: event.target.value })} className={controlClass} /></Field>
            <Field label="Start time (optional)"><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className={controlClass} /></Field>
            <Field label="End time (optional)"><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className={controlClass} /></Field>
            <label className="space-y-2 md:col-span-2"><span className="text-sm text-zinc-300">Instructions</span><textarea required minLength={10} maxLength={10000} rows={5} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className={controlClass} /></label>
          </div>
        )}
        <button disabled={saving || agents.length === 0} className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? "Creating..." : "Create schedule"}</button>
      </form>

      {message && <p aria-live="polite" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200">{message}</p>}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Your schedules</h2>
        {jobs.length === 0 ? <p className="text-zinc-500">No recurring jobs yet.</p> : jobs.map((job) => (
          <JobCard key={job.id} job={job} occurrences={history[job.id]} onUpdate={update} onHistory={toggleHistory} />
        ))}
      </section>
    </div>
  );
}

function JobCard({ job, occurrences, onUpdate, onHistory }: { job: Job; occurrences?: Occurrence[]; onUpdate: (id: string, body: Record<string, string>) => Promise<void>; onHistory: (id: string) => Promise<void> }) {
  const [limit, setLimit] = useState(job.spendingLimit);
  const terminal = job.status === "cancelled" || job.status === "completed";
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{job.name}</h3><p className="text-sm text-zinc-400">{job.agentName} · every {formatInterval(job.intervalMinutes)}</p></div><span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-300">{job.status.replace("_", " ")}</span></div>
      {job.statusReason && <p className="mt-3 text-sm text-amber-300">{job.statusReason}</p>}
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><Metric label="Spent" value={`${job.spentAmount} / ${job.spendingLimit} USDC`} /><Metric label="Price" value={`${job.pricePerRun} USDC/run`} /><Metric label="Runs created" value={String(job.runCount)} /><Metric label="Next run" value={job.nextRunAt ? formatDate(job.nextRunAt, job.timezone) : "None"} /></div>
      {!terminal && <div className="mt-5 flex flex-wrap items-end gap-2"><Field label="Increase total limit"><input value={limit} onChange={(event) => setLimit(event.target.value)} className={`${controlClass} w-36`} /></Field><button onClick={() => onUpdate(job.id, { spendingLimit: limit })} className={secondaryClass}>Save limit</button>{job.status === "active" ? <button onClick={() => onUpdate(job.id, { status: "paused" })} className={secondaryClass}>Pause</button> : <button onClick={() => onUpdate(job.id, { status: "active", spendingLimit: limit })} className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white">Resume</button>}<button onClick={() => window.confirm("Cancel this schedule permanently?") && onUpdate(job.id, { status: "cancelled" })} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400">Cancel</button></div>}
      <button onClick={() => onHistory(job.id)} className="mt-5 text-sm text-violet-400 hover:text-violet-300">{occurrences ? "Hide run history" : "Show run history"}</button>
      {occurrences && <div className="mt-3 space-y-2">{occurrences.length === 0 ? <p className="text-sm text-zinc-500">No runs have been scheduled yet.</p> : occurrences.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-zinc-900 p-3 text-sm"><div><p className="text-zinc-200">{formatDate(item.scheduledFor, job.timezone)} · {item.status.replaceAll("_", " ")}</p>{item.reason && <p className="text-zinc-500">{item.reason}</p>}</div><div className="text-right text-zinc-400">{item.taskStatus && <p>Task: {item.taskStatus}</p>}{item.paymentStatus && <p>Payment: {item.paymentStatus}</p>}{item.taskId && <Link className="text-violet-400" href={`/jobs/${item.taskId}`}>View job</Link>}</div></div>)}</div>}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="block text-sm text-zinc-300">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-zinc-900 p-3"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-zinc-100">{value}</p></div>; }
function formatInterval(minutes: number) { if (minutes % 1440 === 0) return `${minutes / 1440} day(s)`; if (minutes % 60 === 0) return `${minutes / 60} hour(s)`; return `${minutes} minute(s)`; }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
const controlClass = "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500";
const secondaryClass = "rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-violet-500";
