import { randomUUID } from "node:crypto";

import { processTaskPayments } from
  "@/modules/payments/application/process-task-payments";
import { reconcileTaskPayments } from
  "@/modules/payments/application/reconcile-task-payments";
import { sleep } from "./sleep";

const POLL_INTERVAL_MS = 1_000;
const RECONCILIATION_INTERVAL_MS = 60_000;

export async function startPaymentWorker(signal?: AbortSignal) {
  const workerId = `payments-${randomUUID()}`;
  let lastReconciliationAt = 0;
  console.log(`Kaska payment worker started (${workerId})`);

  try {
    while (!signal?.aborted) {
      try {
        await processTaskPayments(10, workerId);
        if (Date.now() - lastReconciliationAt >= RECONCILIATION_INTERVAL_MS) {
          await reconcileTaskPayments(5, workerId);
          lastReconciliationAt = Date.now();
        }
      } catch (error) {
        console.error("Payment worker error:", error);
      }
      await sleep(POLL_INTERVAL_MS, signal);
    }
  } finally {
    console.log(`Kaska payment worker stopped (${workerId})`);
  }
}
