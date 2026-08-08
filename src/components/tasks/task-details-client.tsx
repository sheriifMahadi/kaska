"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

type Attempt = {
  attemptNumber: number;
  status: "running" | "completed" | "failed" | "abandoned";
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  startedAt: string;
  endedAt: string | null;
};

type Task = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  priority: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  nextAttemptAt: string | null;
  attemptCount: number;
  maxAttempts: number;
  error: string | null;
  errorCode: string | null;
  agentName: string;
  output: string | null;
  outputFormat: string | null;
  executionProvider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  tokens: string | null;
  latencyMs: number | null;
  finishReason: string | null;
  attempts: Attempt[];
  paymentStatus: string | null;
  paymentAmount: string | null;
  paymentError: string | null;
  paymentErrorCode: string | null;
  approvalTxHash: string | null;
  escrowTxHash: string | null;
  settlementTxHash: string | null;
  lockedAt: string | null;
  settledAt: string | null;
};

const activeStatuses = new Set(["queued", "running"]);
const activePaymentStatuses = new Set([
  "approval_pending",
  "escrow_pending",
  "locked",
  "charge_pending",
  "refund_pending",
]);

const statusStyles: Record<string, string> = {
  queued: "bg-amber-500/15 text-amber-300",
  running: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  cancelled: "bg-zinc-700 text-zinc-300",
  draft: "bg-amber-500/15 text-amber-300",
};

export function TaskDetailsClient({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadTask = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        cache: "no-store",
        signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Task could not be loaded");
      setTask(data);
      setPageError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPageError(error instanceof Error ? error.message : "Task could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void loadTask(controller.signal),
      0
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadTask]);

  useEffect(() => {
    if (
      !task ||
      (!activeStatuses.has(task.status) &&
        !activePaymentStatuses.has(task.paymentStatus ?? ""))
    ) return;
    const timer = window.setInterval(() => void loadTask(), 2_000);
    return () => window.clearInterval(timer);
  }, [loadTask, task]);

  async function performAction(action: "cancel" | "retry") {
    if (action === "cancel" && !window.confirm("Cancel this queued task?")) return;
    setActionPending(true);
    setPageError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Task could not be ${action}ed`);
      await loadTask();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Task action failed");
    } finally {
      setActionPending(false);
    }
  }

  if (loading) return <div className="text-zinc-400">Loading task...</div>;
  if (!task) return <div className="text-red-400">{pageError ?? "Task not found."}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <Link href="/tasks" className="text-sm text-violet-400 hover:text-violet-300">← Tasks</Link>
          <h1 className="mt-3 text-2xl font-bold text-white">{task.title}</h1>
          <p className="mt-1 text-zinc-400">{task.agentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm capitalize ${statusStyles[task.status] ?? "bg-zinc-800 text-zinc-300"}`}>
            {task.status}
          </span>
          {(task.status === "draft" || task.status === "queued") && (
            <button disabled={actionPending} onClick={() => performAction("cancel")} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 disabled:opacity-50">
              {actionPending ? "Cancelling..." : "Cancel"}
            </button>
          )}
          {task.status === "failed" && (
            <button disabled={actionPending} onClick={() => performAction("retry")} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {actionPending ? "Queueing..." : "Retry"}
            </button>
          )}
        </div>
      </div>

      {pageError && <div className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{pageError}</div>}

      {task.status === "queued" && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">
          {task.nextAttemptAt
            ? `A retry is scheduled for ${formatDate(task.nextAttemptAt)}.`
            : "Waiting for a worker to claim this task."}
        </div>
      )}
      {task.status === "draft" && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">
          Payment is being confirmed. The agent cannot start until the task price is locked on Arc.
        </div>
      )}
      {task.status === "running" && (
        <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-4 text-sm text-blue-200">The agent is working. This page updates automatically.</div>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold text-white">Payment</h2>
        {task.paymentStatus ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Status" value={task.paymentStatus.replaceAll("_", " ")} />
            <Detail label="Task price" value={`${task.paymentAmount ?? "—"} USDC`} />
            <Detail label="Escrow transaction" value={shortHash(task.escrowTxHash)} />
            <Detail label="Settlement transaction" value={shortHash(task.settlementTxHash)} />
          </dl>
        ) : (
          <p className="text-zinc-500">This legacy task has no payment record.</p>
        )}
        {task.paymentError && (
          <p className="mt-4 text-sm text-red-300">
            {task.paymentError}
            {task.paymentErrorCode ? ` (${task.paymentErrorCode})` : ""}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold text-white">Prompt</h2>
        <p className="whitespace-pre-wrap text-zinc-300">{task.prompt}</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-5 font-semibold text-white">Result</h2>
        {task.output ? (
          <div className="space-y-4 text-zinc-300 [&_a]:text-violet-400 [&_a]:underline [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black [&_pre]:p-4 [&_strong]:text-white">
            <ReactMarkdown components={{ a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
              {task.output}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-zinc-500">{resultPlaceholder(task.status)}</p>
        )}
      </section>

      {task.error && (
        <section className="rounded-xl border border-red-900 bg-red-950/30 p-6">
          <h2 className="font-semibold text-red-200">Execution problem</h2>
          <p className="mt-2 text-red-300">{task.error}</p>
          {task.errorCode && <p className="mt-2 font-mono text-xs text-red-400">{task.errorCode}</p>}
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold text-white">Execution details</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Priority" value={task.priority} />
          <Detail label="Attempts" value={`${task.attemptCount} / ${task.maxAttempts}`} />
          <Detail label="Provider" value={task.executionProvider ?? "—"} />
          <Detail label="Model" value={task.model ?? "—"} />
          <Detail label="Input tokens" value={task.inputTokens?.toString() ?? "—"} />
          <Detail label="Output tokens" value={task.outputTokens?.toString() ?? "—"} />
          <Detail label="Total tokens" value={task.tokens ?? "—"} />
          <Detail label="Latency" value={task.latencyMs === null ? "—" : `${task.latencyMs} ms`} />
        </dl>
      </section>

      {task.attempts.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 font-semibold text-white">Attempt history</h2>
          <div className="space-y-3">
            {task.attempts.map((attempt) => (
              <div key={attempt.attemptNumber} className="rounded-lg bg-zinc-900 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-white">Attempt {attempt.attemptNumber}</span>
                  <span className="capitalize text-zinc-400">{attempt.status}</span>
                </div>
                <p className="mt-1 text-zinc-500">
                  {attempt.provider ?? "Provider not reached"}
                  {attempt.latencyMs !== null ? ` · ${attempt.latencyMs} ms` : ""}
                  {` · ${formatDate(attempt.startedAt)}`}
                </p>
                {attempt.errorMessage && <p className="mt-2 text-red-300">{attempt.errorMessage}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-words text-zinc-200">{value}</dd></div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function shortHash(value: string | null) {
  return value ? `${value.slice(0, 10)}…${value.slice(-8)}` : "—";
}

function resultPlaceholder(status: string) {
  if (status === "completed") return "The task completed without a stored result.";
  if (status === "failed") return "No result was produced.";
  if (status === "cancelled") return "This task was cancelled before execution.";
  return "The result will appear here when execution finishes.";
}
