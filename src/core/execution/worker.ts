import { randomUUID } from "node:crypto";

import { processWalletProvisioningQueue } from
  "@/modules/identity/application/process-wallet-provisioning";
import {
  claimNextTask,
  failExhaustedTaskLeases,
} from "@/modules/tasks/application/task-claims";
import { reconcileCircleTransactions } from
  "@/modules/wallets/application/reconcile-circle-transactions";
import { syncPendingWithdrawals } from
  "@/modules/wallets/application/sync-pending-withdrawals";
import { processTaskPayments } from
  "@/modules/payments/application/process-task-payments";
import { reconcileTaskPayments } from
  "@/modules/payments/application/reconcile-task-payments";
import { executeTask } from "./task-executor";

const POLL_INTERVAL = 1000;
const MAX_CONCURRENT_TASKS = 4;

let started = false;

export async function startWorker(signal?: AbortSignal) {
  if (started) return;

  started = true;
  const workerId = `worker-${randomUUID()}`;
  const activeTasks = new Set<Promise<void>>();
  let lastPaymentReconciliationAt = 0;

  console.log(`Kaska worker started (${workerId})`);

  try {
    while (!signal?.aborted) {
      try {
        await processWalletProvisioningQueue();
        await syncPendingWithdrawals();
        await reconcileCircleTransactions();
        await processTaskPayments(10, workerId);
        if (Date.now() - lastPaymentReconciliationAt >= 60_000) {
          await reconcileTaskPayments(5, workerId);
          lastPaymentReconciliationAt = Date.now();
        }
        await failExhaustedTaskLeases();

        while (activeTasks.size < MAX_CONCURRENT_TASKS) {
          const task = await claimNextTask(workerId);
          if (!task) break;

          const execution = executeTask({
            taskId: task.task.id,
            attemptId: task.attemptId,
            attemptNumber: task.task.attemptCount,
            maxAttempts: task.task.maxAttempts,
            workerId,
          })
            .catch((error) => console.error(`Task ${task.task.id} failed`, error))
            .finally(() => activeTasks.delete(execution));

          activeTasks.add(execution);
        }
      } catch (error) {
        console.error("Worker error:", error);
      }

      await sleep(POLL_INTERVAL, signal);
    }

    await Promise.allSettled(activeTasks);
  } finally {
    started = false;
    console.log("Kaska worker stopped");
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      finish();
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
