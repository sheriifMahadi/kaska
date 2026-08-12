import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, lt, or } from "drizzle-orm";

import { executeTask } from "@/core/execution/task-executor";
import {
  claimNextTask,
  failExhaustedTaskLeases,
} from "@/modules/tasks/application/task-claims";
import { processTaskPayments } from
  "@/modules/payments/application/process-task-payments";
import { reconcileTaskPayments } from
  "@/modules/payments/application/reconcile-task-payments";
import { processWalletProvisioningQueue } from
  "@/modules/identity/application/process-wallet-provisioning";
import { processTestTokenGrants } from
  "@/modules/wallets/application/test-token-grants";
import { syncPendingWithdrawals } from
  "@/modules/wallets/application/sync-pending-withdrawals";
import { reconcileCircleTransactions } from
  "@/modules/wallets/application/reconcile-circle-transactions";
import {
  claimDueRecurringJob,
  deferRecurringJobLease,
} from "@/modules/schedules/application/schedule-claims";
import { materializeScheduledTask } from
  "@/modules/schedules/application/materialize-scheduled-task";
import {
  recurringJobs,
  testTokenGrants,
  wallets,
  walletTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { MAX_WALLET_PROVISIONING_ATTEMPTS } from
  "@/modules/identity/domain/wallet-provisioning-policy";

const SCHEDULE_FAILURE_RETRY_MS = 30_000;

export type BatchResult = Readonly<Record<string, number>>;

export async function processTaskBatch(
  limit = 2,
  workerId = `serverless-tasks-${randomUUID()}`
): Promise<BatchResult> {
  await failExhaustedTaskLeases();
  const executions: Promise<void>[] = [];

  for (let claimed = 0; claimed < limit; claimed += 1) {
    const context = await claimNextTask(workerId);
    if (!context) break;
    executions.push(executeTask({
      taskId: context.task.id,
      attemptId: context.attemptId,
      attemptNumber: context.task.attemptCount,
      maxAttempts: context.task.maxAttempts,
      workerId,
    }));
  }

  const outcomes = await Promise.allSettled(executions);
  return {
    claimed: outcomes.length,
    completed: outcomes.filter(({ status }) => status === "fulfilled").length,
    failed: outcomes.filter(({ status }) => status === "rejected").length,
  };
}

export async function processPaymentBatch(
  limit = 5,
  reconciliationLimit = 2,
  workerId = `serverless-payments-${randomUUID()}`
): Promise<BatchResult> {
  const processed = await processTaskPayments(limit, workerId);
  const reconciled = await reconcileTaskPayments(
    reconciliationLimit,
    `${workerId}-reconcile`
  );
  return { processed, reconciled };
}

export async function processWalletBatch(
  limit = 2,
  workerId = `serverless-wallets-${randomUUID()}`,
  reconcile = false
): Promise<BatchResult> {
  const provisioned = await processWalletProvisioningQueue(limit);
  const grants = await processTestTokenGrants(workerId, limit);
  const withdrawals = await syncPendingWithdrawals(limit);
  const reconciliation = reconcile
    ? await reconcileCircleTransactions(limit)
    : { transactions: 0, wallets: 0 };
  const nextWalletWorkAt = await findNextWalletWorkAt();
  return {
    provisioned,
    grants,
    withdrawals,
    transactions: reconciliation.transactions,
    walletsScanned: reconciliation.wallets,
    nextWalletWorkAt: nextWalletWorkAt
      ? Math.floor(nextWalletWorkAt.getTime() / 1_000)
      : 0,
  };
}

async function findNextWalletWorkAt() {
  const now = new Date();
  const staleProvisioningLease = new Date(now.getTime() - 5 * 60_000);
  const [provisioning, grant, withdrawal] = await Promise.all([
    db.select({
      status: wallets.status,
      nextAt: wallets.nextProvisioningAttemptAt,
      leaseAt: wallets.provisioningStartedAt,
    }).from(wallets).where(and(
      lt(wallets.provisioningAttempts, MAX_WALLET_PROVISIONING_ATTEMPTS),
      or(eq(wallets.status, "pending"), eq(wallets.status, "failed"))
    )).orderBy(asc(wallets.nextProvisioningAttemptAt)).limit(1),
    db.select({
      nextAt: testTokenGrants.nextAttemptAt,
      leaseAt: testTokenGrants.leaseExpiresAt,
    }).from(testTokenGrants)
      .where(eq(testTokenGrants.status, "pending"))
      .orderBy(asc(testTokenGrants.nextAttemptAt))
      .limit(1),
    db.select({ updatedAt: walletTransactions.updatedAt })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.type, "withdrawal"),
        eq(walletTransactions.status, "pending"),
        isNotNull(walletTransactions.circleTransactionId)
      ))
      .orderBy(asc(walletTransactions.updatedAt))
      .limit(1),
  ]);

  const provisioningAt = provisioning[0]
    ? provisioning[0].leaseAt && provisioning[0].leaseAt > staleProvisioningLease
      ? new Date(provisioning[0].leaseAt.getTime() + 5 * 60_000)
      : provisioning[0].nextAt ?? now
    : null;
  const grantAt = grant[0]
    ? grant[0].leaseAt && grant[0].leaseAt > now
      ? grant[0].leaseAt
      : grant[0].nextAt
    : null;
  const withdrawalAt = withdrawal[0]
    ? new Date(withdrawal[0].updatedAt.getTime() + 5_000)
    : null;

  return [provisioningAt, grantAt, withdrawalAt]
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

export async function processScheduleBatch(
  limit = 5,
  schedulerId = `serverless-scheduler-${randomUUID()}`
): Promise<BatchResult> {
  let claimed = 0;
  let materialized = 0;
  let deferred = 0;

  for (; claimed < limit; claimed += 1) {
    const job = await claimDueRecurringJob(schedulerId);
    if (!job) break;
    try {
      await materializeScheduledTask(job.id, schedulerId);
      materialized += 1;
    } catch (error) {
      console.error(`Recurring job ${job.id} failed`, error);
      await deferRecurringJobLease(
        job.id,
        schedulerId,
        new Date(Date.now() + SCHEDULE_FAILURE_RETRY_MS)
      );
      deferred += 1;
    }
  }

  const [next] = await db.select({ nextRunAt: recurringJobs.nextRunAt })
    .from(recurringJobs)
    .where(eq(recurringJobs.status, "active"))
    .orderBy(asc(recurringJobs.nextRunAt))
    .limit(1);

  return {
    claimed,
    materialized,
    deferred,
    nextRunAt: next?.nextRunAt
      ? Math.floor(next.nextRunAt.getTime() / 1_000)
      : 0,
  };
}
