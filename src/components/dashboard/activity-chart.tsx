"use client";

import { useMemo, useState } from "react";
import { PanelLoadingSkeleton } from "@/components/shared/loading-skeleton";

type Point = { date: string; amount: string };
type AgentSpend = { date: string; agentId: string; agentName: string; amount: string; taskCount: number };
type Performance = { agentId: string; agentName: string; completed: number; failed: number; averageLatencyMs: number | null; averageCost: string; totalTokens: string };
type Range = 7 | 14 | 30;
type View = "timeline" | "agents" | "performance";

export default function ActivityChart({ points, agentSpending, performance, loading }: {
  points: Point[];
  agentSpending: AgentSpend[];
  performance: Performance[];
  loading: boolean;
}) {
  const [range, setRange] = useState<Range>(14);
  const [view, setView] = useState<View>("timeline");
  const visible = points.slice(-range);
  const firstDate = visible[0]?.date ?? "";
  const agents = useMemo(() => aggregateAgents(
    agentSpending.filter((item) => item.date >= firstDate)
  ), [agentSpending, firstDate]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Workforce Activity</h2>
        <div className="flex rounded-lg bg-zinc-950 p-1">
          {(["timeline", "agents", "performance"] as const).map((option) => <button key={option} type="button" onClick={() => setView(option)} className={`rounded-md px-3 py-1.5 text-xs capitalize transition ${view === option ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-200"}`}>{option === "agents" ? "By agent" : option}</button>)}
        </div>
      </div>
      <div className="mb-3 flex min-h-6 justify-end gap-1">{view === "performance" ? <span className="text-xs text-zinc-600">Last 30 days</span> : ([7, 14, 30] as const).map((days) => <button key={days} type="button" onClick={() => setRange(days)} className={`rounded px-2 py-1 text-xs ${range === days ? "text-violet-300" : "text-zinc-600 hover:text-zinc-300"}`}>{days}D</button>)}</div>
      {loading ? <PanelLoadingSkeleton /> : view === "timeline" ? <Timeline points={visible} /> : view === "agents" ? <AgentBars agents={agents} /> : <PerformanceTable rows={performance} />}
    </div>
  );
}

function Timeline({ points }: { points: Point[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = points.map((point) => Number(point.amount));
  const maximum = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const selected = hovered === null ? null : points[hovered];
  return <div className="flex h-52 flex-col"><ChartValue value={selected ? Number(selected.amount) : total} label={selected ? formatFullDate(selected.date) : "Period total"} /><div className="relative flex min-h-0 flex-1 items-end gap-1 rounded-xl bg-zinc-950 px-3 pb-3 pt-5">{[25, 50, 75].map((position) => <div key={position} className="pointer-events-none absolute inset-x-3 border-t border-zinc-900" style={{ bottom: `${position}%` }} />)}{points.map((point, index) => { const value = Number(point.amount); const height = value === 0 ? 3 : Math.max(8, value / maximum * 100); return <button key={point.date} type="button" aria-label={`${point.date}: ${point.amount} USDC`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} className="group relative z-10 flex h-full min-w-0 flex-1 items-end"><span className={`chart-bar block w-full origin-bottom rounded-t-sm ${hovered === index ? "bg-violet-400" : "bg-violet-600/75 group-hover:bg-violet-400"}`} style={{ height: `${height}%`, animationDelay: `${index * 25}ms` }} /></button>; })}</div><div className="mt-2 flex justify-between text-xs text-zinc-600"><span>{formatDate(points[0]?.date)}</span><span>{formatDate(points.at(-1)?.date)}</span></div></div>;
}

function AgentBars({ agents }: { agents: ReturnType<typeof aggregateAgents> }) {
  const maximum = Math.max(...agents.map((agent) => agent.amount), 1);
  return <div className="h-52 space-y-3 overflow-y-auto rounded-xl bg-zinc-950 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{agents.length === 0 ? <Empty /> : agents.map((agent) => <div key={agent.agentId}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-zinc-300">{agent.agentName}</span><span className="text-zinc-500">{formatUsdc(agent.amount)} USDC · {agent.taskCount} task{agent.taskCount === 1 ? "" : "s"}</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-900"><div className="chart-bar-horizontal h-full origin-left rounded-full bg-violet-600" style={{ width: `${agent.amount / maximum * 100}%` }} /></div></div>)}</div>;
}

function PerformanceTable({ rows }: { rows: Performance[] }) {
  return <div className="h-52 overflow-auto rounded-xl bg-zinc-950 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{rows.length === 0 ? <Empty /> : rows.map((row) => { const terminal = row.completed + row.failed; const success = terminal ? Math.round(row.completed / terminal * 100) : null; return <div key={row.agentId} className="grid min-w-[38rem] grid-cols-[minmax(8rem,1fr)_repeat(4,auto)] items-center gap-5 border-b border-zinc-900 px-4 py-3 text-xs last:border-0"><span className="truncate text-sm text-zinc-200">{row.agentName}</span><Metric label="Success" value={success === null ? "—" : `${success}%`} /><Metric label="Avg time" value={row.averageLatencyMs === null ? "—" : formatLatency(row.averageLatencyMs)} /><Metric label="Avg cost" value={`${formatUsdc(Number(row.averageCost))} USDC`} /><Metric label="Tokens" value={Number(row.totalTokens).toLocaleString()} /></div>; })}</div>;
}

function ChartValue({ value, label }: { value: number; label: string }) { return <div className="mb-2 flex min-h-8 items-center justify-between"><p className="text-2xl font-semibold text-white">{formatUsdc(value)} <span className="text-sm font-normal text-zinc-500">USDC</span></p><p className="text-xs text-zinc-500">{label}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <span className="text-right"><span className="block text-zinc-600">{label}</span><span className="text-zinc-300">{value}</span></span>; }
function Empty() { return <p className="p-4 text-sm text-zinc-500">No activity in this period.</p>; }

function aggregateAgents(items: AgentSpend[]) { const values = new Map<string, { agentId: string; agentName: string; amount: number; taskCount: number }>(); for (const item of items) { const current = values.get(item.agentId) ?? { agentId: item.agentId, agentName: item.agentName, amount: 0, taskCount: 0 }; current.amount += Number(item.amount); current.taskCount += item.taskCount; values.set(item.agentId, current); } return [...values.values()].sort((a, b) => b.amount - a.amount); }
function formatUsdc(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 6 }); }
function date(value?: string) { return value ? new Date(`${value}T00:00:00Z`) : null; }
function formatDate(value?: string) { const parsed = date(value); return parsed ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed) : ""; }
function formatFullDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date(value)!); }
function formatLatency(value: number) { return value < 1_000 ? `${value}ms` : `${(value / 1_000).toFixed(1)}s`; }
