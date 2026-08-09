"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Schedule = {
  id: string;
  name: string;
  status: "active" | "paused" | "auto_paused" | "completed" | "cancelled";
  intervalMinutes: number;
  pricePerRun: string;
  spendingLimit: string;
  spentAmount: string;
  runCount: number;
  timezone: string;
  nextRunAt: string | null;
  agentName: string;
};

export function SchedulesClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/recurring-jobs");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load schedules");
      setSchedules(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <PageLoadingSkeleton cards={3} />;

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Schedules</h1>
        <p className="mt-2 text-zinc-400">Recurring work created while running an agent.</p>
      </div>
      {error ? <p className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</p> : null}
      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center"><CalendarClock className="mx-auto text-zinc-700" /><p className="mt-4 text-zinc-400">No schedules yet.</p><p className="mt-1 text-sm text-zinc-600">Run a recurring-capable agent to create one.</p><Link href="/jobs" className="mt-5 inline-block text-sm text-violet-400">Choose an agent</Link></div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Link key={schedule.id} href={"/schedules/" + schedule.id} className="flex items-center justify-between gap-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-violet-700 hover:bg-zinc-900/60">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-white">{schedule.name}</h2><span className="text-xs capitalize text-zinc-600">{schedule.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-zinc-500">{schedule.agentName} · every {formatInterval(schedule.intervalMinutes)}</p><p className="mt-2 text-xs text-zinc-600">{schedule.spentAmount} / {schedule.spendingLimit} USDC · {schedule.runCount} run{schedule.runCount === 1 ? "" : "s"}{schedule.nextRunAt ? " · next " + formatDate(schedule.nextRunAt, schedule.timezone) : ""}</p></div>
              <ChevronRight className="shrink-0 text-zinc-700" size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatInterval(minutes: number) { if (minutes % 1440 === 0) return `${minutes / 1440} day(s)`; if (minutes % 60 === 0) return `${minutes / 60} hour(s)`; return `${minutes} minute(s)`; }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value)); }
