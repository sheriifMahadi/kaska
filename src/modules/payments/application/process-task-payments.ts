import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { encodeFunctionData, getAddress } from "viem";

import {
  taskPayments,
  taskPaymentAttempts,
  tasks,
  walletLocks,
  wallets,
} from "@/db/schema";
import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import { usdcAbi } from "@/lib/abi/usdc";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import {
  ARC_TESTNET_USDC,
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import { parseUsdc } from "@/modules/payments/domain/usdc";
import {
  paymentLeaseExpiresAt,
  settlementForExecutionStatus,
} from "@/modules/payments/domain/task-payment";
import { statusFromCircleState } from
  "@/modules/wallets/domain/wallet-transaction";
import {
  inspectEscrowSettlement,
  submitEscrowSettlement,
} from "./settle-escrow";
import {
  pauseRecurringJobForPaymentProblem,
  recordRecurringSettlement,
} from "@/modules/schedules/application/record-recurring-outcome";

const POLL_DELAY_MS = 5_000;
const ACTIVE_PAYMENT_STATES = [
  "approval_pending",
  "escrow_pending",
  "locked",
  "charge_pending",
  "refund_pending",
] as const;

function message(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : "Payment processing failed";
}

async function loadPayment(id: string) {
  const [payment] = await db
    .select({
      payment: taskPayments,
      taskStatus: tasks.status,
      recurringJobId: tasks.recurringJobId,
      walletAddress: wallets.address,
      circleWalletId: wallets.circleWalletId,
    })
    .from(taskPayments)
    .innerJoin(tasks, eq(tasks.id, taskPayments.taskId))
    .innerJoin(wallets, eq(wallets.id, taskPayments.walletId))
    .where(eq(taskPayments.id, id))
    .limit(1);
  return payment;
}

type Payment = NonNullable<Awaited<ReturnType<typeof loadPayment>>>;

export async function processTaskPayments(
  limit = 10,
  workerId = `payment-worker-${randomUUID()}`
) {
  let processed = 0;

  while (processed < limit) {
    const payment = await claimNextPayment(workerId);
    if (!payment) break;
    try {
      await processPayment(payment);
    } catch (error) {
      const errorMessage = message(error);
      const attemptKey = currentAttemptKey(payment);
      if (attemptKey) {
        await updateAttempt(attemptKey, {
          error: errorMessage,
          updatedAt: new Date(),
        });
      }
      await db
        .update(taskPayments)
        .set({ error: errorMessage, updatedAt: new Date() })
        .where(eq(taskPayments.id, payment.payment.id));
    } finally {
      await releasePayment(payment.payment.id, workerId);
    }
    processed += 1;
  }

  return processed;
}

async function claimNextPayment(workerId: string) {
  const claimedId = await db.transaction(async (transaction) => {
    const now = new Date();
    const [candidate] = await transaction
      .select({ id: taskPayments.id })
      .from(taskPayments)
      .where(
        and(
          inArray(taskPayments.status, [...ACTIVE_PAYMENT_STATES]),
          lte(taskPayments.updatedAt, new Date(now.getTime() - POLL_DELAY_MS)),
          or(
            isNull(taskPayments.processingLeaseExpiresAt),
            lte(taskPayments.processingLeaseExpiresAt, now)
          )
        )
      )
      .orderBy(asc(taskPayments.updatedAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;
    await transaction.update(taskPayments).set({
      processingOwner: workerId,
      processingLeaseExpiresAt: paymentLeaseExpiresAt(now),
    }).where(eq(taskPayments.id, candidate.id));
    return candidate.id;
  });

  return claimedId ? loadPayment(claimedId) : null;
}

function releasePayment(id: string, workerId: string) {
  return db.update(taskPayments).set({
    processingOwner: null,
    processingLeaseExpiresAt: null,
  }).where(
    and(
      eq(taskPayments.id, id),
      eq(taskPayments.processingOwner, workerId)
    )
  );
}

async function processPayment(context: Payment) {
  if (!context.walletAddress || !context.circleWalletId) {
    throw new Error("The task wallet is not active");
  }

  if (context.payment.status === "approval_pending") {
    return processApproval(context);
  }
  if (context.payment.status === "escrow_pending") {
    return processEscrow(context);
  }
  if (context.payment.status === "locked") {
    const settlement = settlementForExecutionStatus(context.taskStatus);
    if (settlement) return beginSettlement(context, settlement);
    return touch(context.payment.id);
  }
  if (
    context.payment.status === "charge_pending" ||
    context.payment.status === "refund_pending"
  ) {
    return finishSettlement(context);
  }
}

async function processApproval(context: Payment) {
  if (context.taskStatus === "cancelled") {
    await db.update(taskPayments).set({
      status: "refunded",
      settledAt: new Date(),
      error: null,
      updatedAt: new Date(),
    }).where(eq(taskPayments.id, context.payment.id));
    await releaseReservation(context.payment.taskId, "CANCELLED");
    return;
  }

  const amount = parseUsdc(context.payment.amount).microUsdc;
  if (!context.payment.approvalCircleTransactionId) {
    const allowance = await publicClient.readContract({
      address: ARC_TESTNET_USDC,
      abi: usdcAbi,
      functionName: "allowance",
      args: [getAddress(context.walletAddress!), ESCROW_ADDRESS],
    });

    if (allowance >= amount) {
      await updateAttempt(
        context.payment.approvalIdempotencyKey,
        {
          status: "reconciled",
          confirmedAt: new Date(),
          error: null,
          updatedAt: new Date(),
        }
      );
      await movePayment(context.payment.id, "escrow_pending");
      return;
    }

    const callData = encodeFunctionData({
      abi: usdcAbi,
      functionName: "approve",
      args: [ESCROW_ADDRESS, amount],
    });
    const response = await circle.createContractExecutionTransaction({
      idempotencyKey: context.payment.approvalIdempotencyKey,
      walletId: context.circleWalletId!,
      contractAddress: ARC_TESTNET_USDC,
      callData,
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      refId: `kaska:${context.payment.taskId}:approve`,
    });
    if (!response.data?.id) throw new Error("Circle returned no approval transaction ID");
    await db.update(taskPayments).set({
      approvalCircleTransactionId: response.data.id,
      error: null,
      updatedAt: new Date(),
    }).where(eq(taskPayments.id, context.payment.id));
    await updateAttempt(context.payment.approvalIdempotencyKey, {
      status: "submitted",
      circleTransactionId: response.data.id,
      submittedAt: new Date(),
      error: null,
      updatedAt: new Date(),
    });
    return;
  }

  const remote = await getCircleTransaction(
    context.payment.approvalCircleTransactionId
  );
  const status = statusFromCircleState(remote.state);
  if (status === "confirmed") {
    await db.update(taskPayments).set({
      status: "escrow_pending",
      approvalTxHash: remote.txHash ?? null,
      error: null,
      updatedAt: new Date(),
    }).where(eq(taskPayments.id, context.payment.id));
    await updateAttempt(context.payment.approvalIdempotencyKey, {
      status: "confirmed",
      txHash: remote.txHash ?? null,
      blockNumber: remote.blockHeight ?? null,
      confirmedAt: remote.firstConfirmDate
        ? new Date(remote.firstConfirmDate)
        : new Date(),
      error: null,
      updatedAt: new Date(),
    });
  } else if (status === "failed") {
    await failAttempt(
      context.payment.approvalIdempotencyKey,
      "APPROVAL_FAILED",
      circleFailure(remote)
    );
    await failPayment(context, "APPROVAL_FAILED", circleFailure(remote));
  } else {
    await updateAttempt(context.payment.approvalIdempotencyKey, {
      status: "pending",
      txHash: remote.txHash ?? null,
      updatedAt: new Date(),
    });
    await updatePending(context.payment.id, "approvalTxHash", remote.txHash);
  }
}

async function processEscrow(context: Payment) {
  const amount = parseUsdc(context.payment.amount).microUsdc;
  if (!context.payment.escrowCircleTransactionId) {
    const callData = encodeFunctionData({
      abi: escrowAbi,
      functionName: "createEscrow",
      args: [context.payment.escrowId as `0x${string}`, amount],
    });
    const response = await circle.createContractExecutionTransaction({
      idempotencyKey: context.payment.escrowIdempotencyKey,
      walletId: context.circleWalletId!,
      contractAddress: ESCROW_ADDRESS,
      callData,
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      refId: `kaska:${context.payment.taskId}:escrow`,
    });
    if (!response.data?.id) throw new Error("Circle returned no escrow transaction ID");
    await db.update(taskPayments).set({
      escrowCircleTransactionId: response.data.id,
      error: null,
      updatedAt: new Date(),
    }).where(eq(taskPayments.id, context.payment.id));
    await updateAttempt(context.payment.escrowIdempotencyKey, {
      status: "submitted",
      circleTransactionId: response.data.id,
      submittedAt: new Date(),
      error: null,
      updatedAt: new Date(),
    });
    return;
  }

  const remote = await getCircleTransaction(
    context.payment.escrowCircleTransactionId
  );
  const status = statusFromCircleState(remote.state);
  if (status === "failed") {
    await failAttempt(
      context.payment.escrowIdempotencyKey,
      "ESCROW_FAILED",
      circleFailure(remote)
    );
    await failPayment(context, "ESCROW_FAILED", circleFailure(remote));
    return;
  }
  if (status !== "confirmed") {
    await updateAttempt(context.payment.escrowIdempotencyKey, {
      status: "pending",
      txHash: remote.txHash ?? null,
      updatedAt: new Date(),
    });
    await updatePending(context.payment.id, "escrowTxHash", remote.txHash);
    return;
  }

  const escrow = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "escrows",
    args: [context.payment.escrowId as `0x${string}`],
  });
  if (
    Number(escrow[4]) !== 1 ||
    getAddress(escrow[0]) !== getAddress(context.walletAddress!) ||
    escrow[1] !== amount
  ) {
    await markManualReview(
      context,
      "ESCROW_MISMATCH",
      "Confirmed escrow does not match the intended client and amount"
    );
    return;
  }

  const now = new Date();
  await db.transaction(async (transaction) => {
    await transaction.update(taskPaymentAttempts).set({
      status: "confirmed",
      txHash: remote.txHash ?? null,
      blockNumber: remote.blockHeight ?? null,
      confirmedAt: remote.firstConfirmDate
        ? new Date(remote.firstConfirmDate)
        : now,
      error: null,
      updatedAt: now,
    }).where(
      eq(
        taskPaymentAttempts.idempotencyKey,
        context.payment.escrowIdempotencyKey
      )
    );
    await transaction.update(taskPayments).set({
      status: "locked",
      escrowTxHash: remote.txHash ?? null,
      lockedAt: now,
      error: null,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.insert(walletLocks).values({
      walletId: context.payment.walletId,
      taskId: context.payment.taskId,
      escrowTaskId: context.payment.escrowId,
      txHash: remote.txHash ?? null,
      amount: context.payment.amount,
      status: "ACTIVE",
      expiresAt: new Date(Number(escrow[3]) * 1_000),
    }).onConflictDoUpdate({
      target: walletLocks.taskId,
      set: {
        txHash: remote.txHash ?? null,
        status: "ACTIVE",
        expiresAt: new Date(Number(escrow[3]) * 1_000),
      },
    });
    await transaction.update(tasks).set({
      status: "queued",
      queuedAt: now,
      updatedAt: now,
    }).where(
      and(
        eq(tasks.id, context.payment.taskId),
        eq(tasks.status, "draft")
      )
    );
  });
}

async function beginSettlement(
  context: Payment,
  kind: "charge" | "refund"
) {
  await db.update(taskPayments).set({
    status: kind === "charge" ? "charge_pending" : "refund_pending",
    settlementKind: kind,
    error: null,
    updatedAt: new Date(),
  }).where(eq(taskPayments.id, context.payment.id));
}

async function finishSettlement(context: Payment) {
  const kind = context.payment.settlementKind;
  if (!kind) throw new Error("Pending settlement has no settlement kind");
  const escrowId = context.payment.escrowId as `0x${string}`;
  const onChain = await inspectEscrowSettlement(escrowId);
  if (onChain.status !== 1 && !onChain.outcome) {
    await markManualReview(
      context,
      "SETTLEMENT_STATE_INVALID",
      `Escrow has incompatible on-chain status ${onChain.status}`
    );
    return;
  }

  const expired =
    BigInt(Math.floor(Date.now() / 1_000)) >= onChain.expiresAt;
  const effectiveKind =
    onChain.outcome ??
    (kind === "charge" && expired ? "refund" : kind);
  const attempt = await ensureSettlementAttempt(context, effectiveKind);

  if (!onChain.outcome) {
    if (attempt.txHash) {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: attempt.txHash as `0x${string}`,
        });
        if (receipt.status !== "success") {
          await failAttempt(
            attempt.idempotencyKey,
            "SETTLEMENT_REVERTED",
            "The Arc settlement transaction reverted"
          );
          await markManualReview(
            context,
            "SETTLEMENT_REVERTED",
            "The Arc settlement transaction reverted"
          );
        } else {
          await updateAttempt(attempt.idempotencyKey, {
            status: "pending",
            blockNumber: Number(receipt.blockNumber),
            updatedAt: new Date(),
          });
          await touch(context.payment.id);
        }
      } catch {
        await updateAttempt(attempt.idempotencyKey, {
          status: "pending",
          updatedAt: new Date(),
        });
        await touch(context.payment.id);
      }
      return;
    }

    const submitted = await submitEscrowSettlement({
      escrowId,
      kind,
    });
    const now = new Date();
    await db.transaction(async (transaction) => {
      await transaction.update(taskPaymentAttempts).set({
        status: "submitted",
        txHash: submitted.hash,
        submittedAt: now,
        error: null,
        updatedAt: now,
      }).where(eq(taskPaymentAttempts.id, attempt.id));
      await transaction.update(taskPayments).set({
        settlementTxHash: submitted.hash,
        updatedAt: now,
      }).where(eq(taskPayments.id, context.payment.id));
    });
    return;
  }

  const now = new Date();
  const finalKind = onChain.outcome;
  if (kind === "refund" && finalKind === "charge") {
    await markManualReview(
      context,
      "SETTLEMENT_CONFLICT",
      "A refund was required, but the escrow is charged on-chain"
    );
    return;
  }
  await db.transaction(async (transaction) => {
    await transaction.update(taskPaymentAttempts).set({
      status: attempt.txHash ? "confirmed" : "reconciled",
      confirmedAt: now,
      error: null,
      updatedAt: now,
    }).where(eq(taskPaymentAttempts.id, attempt.id));
    await transaction.update(taskPayments).set({
      status: finalKind === "charge" ? "charged" : "refunded",
      settledAt: now,
      errorCode:
        kind === "charge" && finalKind === "refund"
          ? "CHARGE_WINDOW_EXPIRED"
          : null,
      error:
        kind === "charge" && finalKind === "refund"
          ? "The charge window expired, so the escrow was returned to the user."
          : null,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.update(walletLocks).set({
      status: finalKind === "charge" ? "CHARGED" : "RELEASED",
      releasedAt: now,
    }).where(eq(walletLocks.taskId, context.payment.taskId));
    await recordRecurringSettlement(transaction, {
      recurringJobId: context.recurringJobId,
      outcome: finalKind,
      amount: context.payment.amount,
      now,
    });
  });
}

async function ensureSettlementAttempt(
  context: Payment,
  kind: "charge" | "refund"
) {
  await db.insert(taskPaymentAttempts).values({
    taskPaymentId: context.payment.id,
    taskId: context.payment.taskId,
    kind,
    idempotencyKey: context.payment.settlementIdempotencyKey,
    provider: "operator",
  }).onConflictDoNothing({
    target: taskPaymentAttempts.idempotencyKey,
  });

  const [attempt] = await db.select()
    .from(taskPaymentAttempts)
    .where(
      eq(
        taskPaymentAttempts.idempotencyKey,
        context.payment.settlementIdempotencyKey
      )
    )
    .limit(1);
  if (!attempt) throw new Error("Settlement attempt could not be prepared");
  return attempt;
}

async function getCircleTransaction(id: string) {
  const response = await circle.getTransaction({ id });
  if (!response.data?.transaction) throw new Error("Circle returned no transaction");
  return response.data.transaction;
}

function circleFailure(remote: Awaited<ReturnType<typeof getCircleTransaction>>) {
  return [remote.errorReason, remote.errorDetails]
    .filter(Boolean)
    .join(": ") || remote.state;
}

type AttemptUpdate = Partial<typeof taskPaymentAttempts.$inferInsert>;

function updateAttempt(idempotencyKey: string, values: AttemptUpdate) {
  return db.update(taskPaymentAttempts).set(values).where(
    eq(taskPaymentAttempts.idempotencyKey, idempotencyKey)
  );
}

function failAttempt(
  idempotencyKey: string,
  errorCode: string,
  error: string
) {
  const now = new Date();
  return updateAttempt(idempotencyKey, {
    status: "failed",
    errorCode,
    error,
    failedAt: now,
    updatedAt: now,
  });
}

async function failPayment(context: Payment, code: string, error: string) {
  const now = new Date();
  await db.transaction(async (transaction) => {
    await transaction.update(taskPayments).set({
      status: "failed",
      errorCode: code,
      error,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.update(tasks).set({
      status: "failed",
      failedAt: now,
      errorCode: code,
      error,
      updatedAt: now,
    }).where(eq(tasks.id, context.payment.taskId));
    await transaction.update(walletLocks).set({
      status: "RELEASED",
      releasedAt: now,
    }).where(and(
      eq(walletLocks.taskId, context.payment.taskId),
      eq(walletLocks.status, "RESERVED")
    ));
    await pauseRecurringJobForPaymentProblem(
      transaction,
      context.recurringJobId,
      "A run could not be funded. Check the wallet balance and try again.",
      now
    );
  });
}

function releaseReservation(
  taskId: string,
  status: "RELEASED" | "CANCELLED"
) {
  return db.update(walletLocks).set({
    status,
    releasedAt: new Date(),
  }).where(and(
    eq(walletLocks.taskId, taskId),
    eq(walletLocks.status, "RESERVED")
  ));
}

async function markManualReview(
  context: Payment,
  code: string,
  error: string
) {
  const now = new Date();
  await db.transaction(async (transaction) => {
    const attemptKey = currentAttemptKey(context);
    if (attemptKey) {
      await transaction.update(taskPaymentAttempts).set({
        status: "failed",
        errorCode: code,
        error,
        failedAt: now,
        updatedAt: now,
      }).where(eq(taskPaymentAttempts.idempotencyKey, attemptKey));
    }
    await transaction.update(taskPayments).set({
      status: "manual_review",
      errorCode: code,
      error,
      updatedAt: now,
    }).where(eq(taskPayments.id, context.payment.id));
    await transaction.update(tasks).set({
      status: "manual_review",
      errorCode: code,
      error,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    }).where(eq(tasks.id, context.payment.taskId));
    await pauseRecurringJobForPaymentProblem(
      transaction,
      context.recurringJobId,
      `Payment requires review: ${error}`,
      now
    );
  });
}

function currentAttemptKey(context: Payment) {
  if (context.payment.status === "approval_pending") {
    return context.payment.approvalIdempotencyKey;
  }
  if (context.payment.status === "escrow_pending") {
    return context.payment.escrowIdempotencyKey;
  }
  if (
    context.payment.status === "charge_pending" ||
    context.payment.status === "refund_pending"
  ) {
    return context.payment.settlementIdempotencyKey;
  }
  return null;
}

function updatePending(
  id: string,
  field: "approvalTxHash" | "escrowTxHash",
  txHash?: string
) {
  return db.update(taskPayments).set({
    ...(txHash ? { [field]: txHash } : {}),
    updatedAt: new Date(),
  }).where(eq(taskPayments.id, id));
}

function movePayment(id: string, status: "escrow_pending") {
  return db.update(taskPayments).set({
    status,
    error: null,
    updatedAt: new Date(),
  }).where(eq(taskPayments.id, id));
}

function touch(id: string) {
  return db.update(taskPayments).set({ updatedAt: new Date() })
    .where(eq(taskPayments.id, id));
}
