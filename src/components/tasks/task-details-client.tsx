"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ChevronDown } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useConfirmation } from "@/components/shared/confirmation-provider";

type Attempt = {
  attemptNumber: number;
  status: "running" | "completed" | "failed" | "abandoned";
  provider: string | null;
  requestedModel: string | null;
  model: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  startedAt: string;
  endedAt: string | null;
};

type PaymentAttempt = {
  kind: "approval" | "escrow" | "charge" | "refund";
  attemptNumber: number;
  status: string;
  provider: string;
  circleTransactionId: string | null;
  txHash: string | null;
  blockNumber: number | null;
  errorCode: string | null;
  error: string | null;
  preparedAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
};

type Task = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  workflowState: string;
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
  requestedModel: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  tokens: string | null;
  latencyMs: number | null;
  finishReason: string | null;
  webSearchRequests: number | null;
  citations: Array<{ title: string; url: string }> | null;
  attempts: Attempt[];
  paymentAttempts: PaymentAttempt[];
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

type TimelineEvent = {
  key: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  txHash?: string | null;
  error?: string | null;
};

const ARC_EXPLORER_URL = "https://testnet.arcscan.app";

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
  MANUAL_REVIEW: "bg-red-500/15 text-red-300",
  CHARGED: "bg-emerald-500/15 text-emerald-300",
  REFUNDED: "bg-zinc-700 text-zinc-300",
};

export function TaskDetailsClient({
  taskId,
  returnToAgentId,
  returnToScheduleId,
}: {
  taskId: string;
  returnToAgentId?: string;
  returnToScheduleId?: string;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(true);
  const confirmAction = useConfirmation();

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
    if (
      action === "cancel" &&
      !(await confirmAction({
        title: "Cancel this job?",
        description: "The job will not run. If its funds are already locked, Kaska will return them through the normal refund flow.",
        confirmLabel: "Cancel job",
      }))
    ) return;
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

  if (loading) return <PageLoadingSkeleton cards={3} />;
  if (!task) return <div className="text-red-400">{pageError ?? "Job not found."}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <Link
            href={
              returnToScheduleId
                ? "/schedules/" + returnToScheduleId
                : returnToAgentId
                  ? "/jobs/agents/" + returnToAgentId
                  : "/jobs"
            }
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-white">{task.title}</h1>
          <p className="mt-1 text-zinc-400">{task.agentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm capitalize ${statusStyles[task.workflowState] ?? statusStyles[task.status] ?? "bg-zinc-800 text-zinc-300"}`}>
            {task.workflowState.replaceAll("_", " ")}
          </span>
          {(task.status === "draft" || task.status === "queued") && (
            <button disabled={actionPending} onClick={() => performAction("cancel")} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 disabled:opacity-50">
              {actionPending ? "Cancelling..." : "Cancel"}
            </button>
          )}
          {task.status === "failed" && !task.paymentStatus && (
            <button disabled={actionPending} onClick={() => performAction("retry")} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {actionPending ? "Queueing..." : "Retry"}
            </button>
          )}
        </div>
      </div>

      {pageError && <div className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{pageError}</div>}

      {task.workflowState === "MANUAL_REVIEW" && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          <p className="font-medium">This task needs manual review.</p>
          <p className="mt-1">Automatic processing has stopped to prevent another charge or refund. Keep this task ID and the error code below when contacting the Kaska operator. Do not create a replacement task until the payment is checked.</p>
        </div>
      )}

      {task.workflowState === "ESCROW_FAILED" && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          Payment could not be locked, so the agent did not start. Any local reservation has been released. Review the payment error below before creating another task.
        </div>
      )}

      {(task.workflowState === "EXECUTION_FAILED" || task.workflowState === "REFUND_PENDING") && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">
          The agent could not complete the task. Kaska will return the locked USDC automatically; keep the worker running until the refund is confirmed.
        </div>
      )}

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
            <TransactionDetail label="Escrow transaction" hash={task.escrowTxHash} />
            <TransactionDetail label="Settlement transaction" hash={task.settlementTxHash} />
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

      <section className="rounded-xl border border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() => setResultOpen((value) => !value)}
          aria-expanded={resultOpen}
          className="flex w-full items-center justify-between gap-4 p-6 text-left"
        >
          <h2 className="font-semibold text-white">Result</h2>
          <ChevronDown
            size={18}
            className={`text-zinc-500 transition ${resultOpen ? "rotate-180" : ""}`}
          />
        </button>
        {resultOpen ? (
          <div className="border-t border-zinc-800 px-6 pb-6 pt-5">
            {task.output ? (
              <div className="space-y-4 text-zinc-300 [&_a]:text-violet-400 [&_a]:underline [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black [&_pre]:p-4 [&_strong]:text-white">
                <ReactMarkdown components={{ a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
                  {task.output}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-zinc-500">{resultPlaceholder(task.status)}</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold text-white">Prompt</h2>
        <p className="whitespace-pre-wrap text-zinc-300">{task.prompt}</p>
      </section>

      {task.error && (
        <section className="rounded-xl border border-red-900 bg-red-950/30 p-6">
          <h2 className="font-semibold text-red-200">Execution problem</h2>
          <p className="mt-2 text-red-300">{task.error}</p>
          {task.errorCode && <p className="mt-2 font-mono text-xs text-red-400">{task.errorCode}</p>}
        </section>
      )}

      <TaskTimeline task={task} />

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold text-white">Execution details</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Priority" value={task.priority} />
          <Detail label="Attempts" value={`${task.attemptCount} / ${task.maxAttempts}`} />
          <Detail label="Provider" value={task.executionProvider ?? "—"} />
          <Detail label="Requested model" value={task.requestedModel ?? "—"} />
          <Detail label="Returned model" value={task.model ?? "—"} />
          <Detail label="Input tokens" value={task.inputTokens?.toString() ?? "—"} />
          <Detail label="Output tokens" value={task.outputTokens?.toString() ?? "—"} />
          <Detail label="Total tokens" value={task.tokens ?? "—"} />
          <Detail label="Web searches" value={task.webSearchRequests?.toString() ?? "0"} />
          <Detail label="Latency" value={task.latencyMs === null ? "—" : `${task.latencyMs} ms`} />
        </dl>
      </section>

    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-words text-zinc-200">{value}</dd></div>;
}

function TransactionDetail({ label, hash }: { label: string; hash: string | null }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1">
        {hash ? (
          <a href={`${ARC_EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-violet-400 hover:text-violet-300 hover:underline">
            {shortHash(hash)} ↗
          </a>
        ) : <span className="text-zinc-200">—</span>}
      </dd>
    </div>
  );
}

function TaskTimeline({ task }: { task: Task }) {
  const events = buildTimeline(task);
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-6 text-left"
      >
        <h2 className="font-semibold text-white">Job timeline</h2>
        <ChevronDown
          size={18}
          className={`text-zinc-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="border-t border-zinc-800 px-6 pb-6 pt-5">
        {events.map((event, index) => (
          <div key={event.key} className="relative grid grid-cols-[20px_1fr] gap-3 pb-6 last:pb-0">
            {index < events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-zinc-800" />}
            <span className={`relative mt-1 h-3 w-3 rounded-full ${timelineDot(event.status)}`} />
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-white">{event.title}</h3>
                <span className="text-xs capitalize text-zinc-500">{event.status.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{event.description}</p>
              <p className="mt-1 text-xs text-zinc-600">{formatDate(event.timestamp)}</p>
              {event.txHash && (
                <a href={`${ARC_EXPLORER_URL}/tx/${event.txHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-xs text-violet-400 hover:underline">
                  View {shortHash(event.txHash)} on Arcscan ↗
                </a>
              )}
              {event.error && <p className="mt-2 text-sm text-red-300">{event.error}</p>}
            </div>
          </div>
        ))}
      </div> : null}
    </section>
  );
}

function buildTimeline(task: Task): TimelineEvent[] {
  const events: TimelineEvent[] = [{
    key: "created",
    title: "Task created",
    description: task.paymentStatus
      ? "The task price was reserved in your Kaska wallet."
      : "The task was saved.",
    status: "completed",
    timestamp: task.createdAt,
  }];

  for (const attempt of task.paymentAttempts) {
    events.push({
      key: `payment-${attempt.kind}-${attempt.attemptNumber}`,
      title: paymentTitle(attempt.kind),
      description: paymentDescription(attempt.kind, attempt.status),
      status: attempt.status,
      timestamp: attempt.confirmedAt ?? attempt.failedAt ?? attempt.submittedAt ?? attempt.preparedAt,
      txHash: attempt.txHash,
      error: attempt.error
        ? `${attempt.error}${attempt.errorCode ? ` (${attempt.errorCode})` : ""}`
        : null,
    });
  }

  for (const attempt of task.attempts) {
    events.push({
      key: `execution-${attempt.attemptNumber}`,
      title: `Agent execution attempt ${attempt.attemptNumber}`,
      description: executionDescription(attempt.status),
      status: attempt.status,
      timestamp: attempt.endedAt ?? attempt.startedAt,
      error: attempt.errorMessage,
    });
  }

  return events.sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}

function paymentTitle(kind: PaymentAttempt["kind"]) {
  if (kind === "approval") return "USDC spending approval";
  if (kind === "escrow") return "Task price locked";
  if (kind === "charge") return "Task payment charged";
  return "Task payment refunded";
}

function paymentDescription(kind: PaymentAttempt["kind"], status: string) {
  if (status === "failed") {
    return "This payment step failed. Automatic processing stopped before another transaction could be submitted.";
  }
  const finished = status === "confirmed" || status === "reconciled";
  if (kind === "approval") {
    return finished
      ? "Your wallet allowed the Kaska escrow contract to lock this task’s exact price."
      : "Kaska is asking your wallet to approve the escrow contract.";
  }
  if (kind === "escrow") {
    return finished
      ? "The task price is safely locked on Arc, so execution may begin."
      : "Kaska is moving the exact task price into the Arc escrow contract.";
  }
  if (kind === "charge") {
    return finished
      ? "The task succeeded and the locked USDC was sent to the Kaska treasury."
      : "The task succeeded and Kaska is settling the locked payment.";
  }
  return finished
    ? "The task did not complete and the locked USDC was returned to your wallet."
    : "Kaska is returning the locked task price to your wallet.";
}

function executionDescription(status: Attempt["status"]) {
  if (status === "completed") return "The agent finished and saved its result.";
  if (status === "failed") return "The agent failed; Kaska will retry or refund according to the task state.";
  if (status === "abandoned") return "The worker stopped responding and this attempt was safely abandoned.";
  return "A worker claimed the task and the agent is processing it.";
}

function timelineDot(status: string) {
  if (status === "failed" || status === "abandoned") return "bg-red-500";
  if (status === "confirmed" || status === "completed" || status === "reconciled") return "bg-emerald-500";
  return "bg-amber-500";
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
