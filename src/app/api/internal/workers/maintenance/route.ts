import {
  processPaymentBatch,
  processScheduleBatch,
  processTaskBatch,
  processWalletBatch,
} from "@/core/serverless/process-batches";
import { dispatchWorkerOutbox } from
  "@/core/serverless/worker-outbox";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 240;

export const POST = workerRoute(
  "maintenance",
  async () => {
    const outbox = await dispatchWorkerOutbox(10);
    const schedules = await processScheduleBatch(2);
    const payments = await processPaymentBatch(2, 1);
    const tasks = await processTaskBatch(1);
    const wallets = await processWalletBatch(1, undefined, true);
    return {
      outboxPublished: outbox.published,
      outboxPending: outbox.pending,
      schedulesClaimed: schedules.claimed,
      schedulesMaterialized: schedules.materialized,
      schedulesNextRunAt: schedules.nextRunAt,
      paymentsProcessed: payments.processed,
      paymentsReconciled: payments.reconciled,
      paymentsNextWorkAt: payments.nextPaymentWorkAt,
      tasksClaimed: tasks.claimed,
      tasksCompleted: tasks.completed,
      tasksFailed: tasks.failed,
      walletsProvisioned: wallets.provisioned,
      walletGrants: wallets.grants,
      walletWithdrawals: wallets.withdrawals,
      walletTransactions: wallets.transactions,
      walletsNextWorkAt: wallets.nextWalletWorkAt,
    };
  },
  (result) => [
    ...(result.schedulesMaterialized > 0 ? ["payments" as const] : []),
    ...(result.paymentsProcessed > 0 ? ["tasks" as const] : []),
    ...(result.paymentsProcessed > 0 ? ["schedules" as const] : []),
    ...(result.tasksClaimed > 0 ? ["payments" as const] : []),
    ...(result.paymentsNextWorkAt > 0
      ? [{
          role: "payments" as const,
          notBefore: new Date(result.paymentsNextWorkAt * 1_000),
        }]
      : []),
    ...(result.schedulesNextRunAt > 0
      ? [{
          role: "schedules" as const,
          notBefore: new Date(result.schedulesNextRunAt * 1_000),
        }]
      : []),
    ...(result.walletsNextWorkAt > 0
      ? [{
          role: "wallets" as const,
          notBefore: new Date(result.walletsNextWorkAt * 1_000),
        }]
      : []),
  ]
);
