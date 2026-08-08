"use client";

import { useState } from "react";

type Point = { date: string; amount: string };
type Range = 7 | 14 | 30;

export default function ActivityChart({ points, loading }: {
  points: Point[];
  loading: boolean;
}) {
  const [range, setRange] = useState<Range>(14);
  const [hovered, setHovered] = useState<number | null>(null);
  const visible = points.slice(-range);
  const values = visible.map((point) => Number(point.amount));
  const maximum = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const selected = hovered === null ? null : visible[hovered];

  return (
    <div className="h-80 rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Workforce Activity</h2>
          <p className="text-xs text-zinc-500">USDC charged over time</p>
        </div>
        <div className="flex rounded-lg bg-zinc-950 p-1">
          {([7, 14, 30] as const).map((days) => (
            <button key={days} type="button" onClick={() => { setRange(days); setHovered(null); }} className={`rounded-md px-2.5 py-1 text-xs transition ${range === days ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-200"}`}>{days}D</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-52 animate-pulse items-center justify-center rounded-xl bg-zinc-950 text-zinc-600">Loading spending...</div>
      ) : (
        <div className="flex h-52 flex-col">
          <div className="mb-2 flex min-h-8 items-center justify-between">
            <p className="text-2xl font-semibold text-white">{formatUsdc(selected ? Number(selected.amount) : total)} <span className="text-sm font-normal text-zinc-500">USDC</span></p>
            <p className="text-xs text-zinc-500">{selected ? formatFullDate(selected.date) : `${range}-day total`}</p>
          </div>
          <div className="relative flex min-h-0 flex-1 items-end gap-1 rounded-xl bg-zinc-950 px-3 pb-3 pt-5">
            {[25, 50, 75].map((position) => <div key={position} className="pointer-events-none absolute inset-x-3 border-t border-zinc-900" style={{ bottom: `${position}%` }} />)}
            {visible.map((point, index) => {
              const value = Number(point.amount);
              const height = value === 0 ? 3 : Math.max(8, value / maximum * 100);
              return (
                <button key={point.date} type="button" aria-label={`${point.date}: ${point.amount} USDC`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} className="group relative z-10 flex h-full min-w-0 flex-1 items-end">
                  <span className={`chart-bar block w-full origin-bottom rounded-t-sm transition-colors duration-200 ${hovered === index ? "bg-violet-400" : "bg-violet-600/75 group-hover:bg-violet-400"}`} style={{ height: `${height}%`, animationDelay: `${index * 25}ms` }} />
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-600"><span>{formatDate(visible[0]?.date)}</span><span>{formatDate(visible.at(-1)?.date)}</span></div>
        </div>
      )}
    </div>
  );
}

function formatUsdc(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 6 }); }
function date(value?: string) { return value ? new Date(`${value}T00:00:00Z`) : null; }
function formatDate(value?: string) { const parsed = date(value); return parsed ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed) : ""; }
function formatFullDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date(value)!); }
