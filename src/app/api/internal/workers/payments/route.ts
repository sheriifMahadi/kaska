import { processPaymentBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = workerRoute(
  "payments",
  () => processPaymentBatch(5, 2),
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
