"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  workflowState?: string;
  agentName: string;
  createdAt: string;
};

const colors: Record<string, string> = {
  queued: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-zinc-500",
  DRAFT: "bg-zinc-600",
  ESCROW_PENDING: "bg-amber-500",
  ESCROW_FAILED: "bg-red-500",
  FUNDS_LOCKED: "bg-violet-500",
  QUEUED: "bg-yellow-500",
  RUNNING: "bg-blue-500",
  EXECUTION_SUCCEEDED: "bg-green-500",
  EXECUTION_FAILED: "bg-red-500",
  CANCELLED: "bg-zinc-500",
  CHARGE_PENDING: "bg-amber-500",
  CHARGED: "bg-green-500",
  REFUND_PENDING: "bg-amber-500",
  REFUNDED: "bg-zinc-500",
  MANUAL_REVIEW: "bg-red-700",
};

export function TaskList({
  tasks,
  returnToAgentId,
  pageSize,
}: {
  tasks: Task[];
  returnToAgentId?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
        No jobs yet.
      </div>
    );
  }

  const size = pageSize ?? tasks.length;
  const pageCount = Math.max(1, Math.ceil(tasks.length / size));
  const visibleTasks = tasks.slice(page * size, page * size + size);

  return (
    <>
    <div className="space-y-4">
      {visibleTasks.map((task) => {
        const displayStatus = task.workflowState ?? task.status;
        return (
        <Link
          key={task.id}
          href={
            `/jobs/${task.id}` +
            (returnToAgentId
              ? `?fromAgent=${encodeURIComponent(returnToAgentId)}`
              : "")
          }
          className="block"
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">
                  {task.title}
                </h3>

                <p className="text-sm text-zinc-500">
                  {task.agentName}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs text-white ${
                  colors[displayStatus] ?? "bg-zinc-600"
                }`}
              >
                {displayStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </Link>
        );
      })}
    </div>
    {pageSize && pageCount > 1 ? (
      <div className="mt-4 flex items-center justify-end gap-3">
        <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} aria-label="Previous jobs" className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-xs text-zinc-600">{page + 1} / {pageCount}</span>
        <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Next jobs" className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
    ) : null}
    </>
  );
}
