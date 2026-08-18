import { processPaymentBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";
import { dispatchWorkerOutbox } from
  "@/core/serverless/worker-outbox";

export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = workerRoute(
  "payments",
  async () => {
    const outbox = await dispatchWorkerOutbox(10);
    const payments = await processPaymentBatch(5, 2);
    return {
      ...payments,
      outboxPublished: outbox.published,
      outboxPending: outbox.pending,
    };
  },
  (result) => [
    ...(result.processed > 0 ? ["tasks" as const] : []),
    // A recurring run may have blocked later occurrences while its payment was
    // unsettled. Recheck schedules as soon as payment state changes so the next
    // eligible run does not wait for the periodic reconciliation alarm.
    ...(result.processed > 0 ? ["schedules" as const] : []),
    ...(result.nextPaymentWorkAt > 0
      ? [{
          role: "payments" as const,
          notBefore: new Date(result.nextPaymentWorkAt * 1_000),
        }]
      : []),
  ]
);
