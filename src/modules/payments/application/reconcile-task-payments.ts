import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { getAddress } from "viem";

import {
  taskPaymentAttempts,
  taskPayments,
  tasks,
  walletLocks,
  wallets,
} from "@/db/schema";
import { db } from "@/lib/db";
import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import { ESCROW_ADDRESS, publicClient } from
  "@/platform/blockchain/arc";
import {
  paymentLeaseExpiresAt,
  paymentReconciliationAction,
} from "@/modules/payments/domain/task-payment";
import { parseUsdc } from "@/modules/payments/domain/usdc";

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1_000;

export async function reconcileTaskPayments(
  limit = 5,
  workerId = "payment-reconciler"
) {
  let reconciled = 0;
  while (reconciled < limit) {
    const context = await claimForReconciliation(workerId);
    if (!context) break;
    try {
      await reconcilePayment(context);
    } catch (error) {
      await db.update(taskPayments).set({
        error: error instanceof Error
          ? error.message.slice(0, 2_000)
          : "Arc reconciliation failed",
        chainReconciledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(taskPayments.id, context.payment.id));
    } finally {
      await release(context.payment.id, workerId);
    }
    reconciled += 1;
  }
  return reconciled;
}

async function claimForReconciliation(workerId: string) {
  const id = await db.transaction(async (transaction) => {
    const now = new Date();
    const [candidate] = await transaction.select({ id: taskPayments.id })
      .from(taskPayments)
      .where(and(
        or(
          isNull(taskPayments.chainReconciledAt),
          lte(
            taskPayments.chainReconciledAt,
            new Date(now.getTime() - RECONCILIATION_INTERVAL_MS)
          )
        ),
        or(
          isNull(taskPayments.processingLeaseExpiresAt),
          lte(taskPayments.processingLeaseExpiresAt, now)
        )
      ))
      .orderBy(asc(taskPayments.chainReconciledAt), asc(taskPayments.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!candidate) return null;
    await transaction.update(taskPayments).set({
      processingOwner: workerId,
      processingLeaseExpiresAt: paymentLeaseExpiresAt(now),
    }).where(eq(taskPayments.id, candidate.id));
    return candidate.id;
  });
  if (!id) return null;
  const [context] = await db.select({
    payment: taskPayments,
    executionStatus: tasks.status,
    walletAddress: wallets.address,
  }).from(taskPayments)
    .innerJoin(tasks, eq(tasks.id, taskPayments.taskId))
    .innerJoin(wallets, eq(wallets.id, taskPayments.walletId))
    .where(eq(taskPayments.id, id))
    .limit(1);
  return context;
}

type Context = NonNullable<Awaited<ReturnType<typeof claimForReconciliation>>>;

async function reconcilePayment(context: Context) {
  const escrow = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "escrows",
    args: [context.payment.escrowId as `0x${string}`],
  });
  const status = Number(escrow[4]);
  const action = paymentReconciliationAction(
    context.payment.status,
    context.executionStatus,
    status,
    context.payment.settlementKind
  );
  const now = new Date();

  if (status !== 0 && (
    getAddress(escrow[0]) !== getAddress(context.walletAddress!) ||
    escrow[1] !== parseUsdc(context.payment.amount).microUsdc
  )) {
    return manualReview(context, "ESCROW_MISMATCH", now);
  }
  if (action === "manual_review") {
    return manualReview(
      context,
      "CHAIN_DATABASE_CONFLICT",
      now,
      `Database payment ${context.payment.status} conflicts with Arc escrow status ${status}`
    );
  }
  if (action === "lock") return repairLock(context, escrow[3], now);
  if (action === "charge" || action === "refund") {
    return repairSettlement(context, action, now);
  }
  await db.update(taskPayments).set({
    chainReconciledAt: now,
    error: null,
  }).where(eq(taskPayments.id, context.payment.id));
}

async function repairLock(context: Context, expiresAt: bigint, now: Date) {
  await db.transaction(async (transaction) => {
    await transaction.update(taskPaymentAttempts).set({
      status: "reconciled",
      confirmedAt: now,
      error: null,
      updatedAt: now,
    }).where(eq(
      taskPaymentAttempts.idempotencyKey,
      context.payment.escrowIdempotencyKey
    ));
    await transaction.update(taskPayments).set({
      status: "locked",
      lockedAt: context.payment.lockedAt ?? now,
      chainReconciledAt: now,
      errorCode: null,
      error: null,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.insert(walletLocks).values({
      walletId: context.payment.walletId,
      taskId: context.payment.taskId,
      escrowTaskId: context.payment.escrowId,
      txHash: context.payment.escrowTxHash,
      amount: context.payment.amount,
      status: "ACTIVE",
      expiresAt: new Date(Number(expiresAt) * 1_000),
    }).onConflictDoUpdate({
      target: walletLocks.taskId,
      set: {
        status: "ACTIVE",
        expiresAt: new Date(Number(expiresAt) * 1_000),
      },
    });
    await transaction.update(tasks).set({
      status: context.executionStatus === "draft" ? "queued" : context.executionStatus,
      queuedAt: context.executionStatus === "draft" ? now : undefined,
      updatedAt: now,
    }).where(eq(tasks.id, context.payment.taskId));
  });
}

async function repairSettlement(
  context: Context,
  kind: "charge" | "refund",
  now: Date
) {
  await db.transaction(async (transaction) => {
    await transaction.insert(taskPaymentAttempts).values({
      taskPaymentId: context.payment.id,
      taskId: context.payment.taskId,
      kind,
      status: "reconciled",
      idempotencyKey: context.payment.settlementIdempotencyKey,
      provider: "operator",
      confirmedAt: now,
    }).onConflictDoUpdate({
      target: taskPaymentAttempts.idempotencyKey,
      set: { status: "reconciled", confirmedAt: now, error: null, updatedAt: now },
    });
    await transaction.update(taskPayments).set({
      status: kind === "charge" ? "charged" : "refunded",
      settlementKind: kind,
      settledAt: context.payment.settledAt ?? now,
      chainReconciledAt: now,
      errorCode: null,
      error: null,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.update(walletLocks).set({
      status: kind === "charge" ? "CHARGED" : "RELEASED",
      releasedAt: now,
    }).where(eq(walletLocks.taskId, context.payment.taskId));
  });
}

async function manualReview(
  context: Context,
  code: string,
  now: Date,
  detail = "Arc escrow does not match the stored payment"
) {
  await db.transaction(async (transaction) => {
    await transaction.update(taskPayments).set({
      status: "manual_review",
      errorCode: code,
      error: detail,
      chainReconciledAt: now,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.update(tasks).set({
      status: "manual_review",
      errorCode: code,
      error: detail,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    }).where(eq(tasks.id, context.payment.taskId));
  });
}

function release(id: string, workerId: string) {
  return db.update(taskPayments).set({
    processingOwner: null,
    processingLeaseExpiresAt: null,
  }).where(and(
    eq(taskPayments.id, id),
    eq(taskPayments.processingOwner, workerId)
  ));
}
