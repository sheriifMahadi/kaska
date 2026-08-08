import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { encodeFunctionData, getAddress } from "viem";

import {
  taskPayments,
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
import { settlementForExecutionStatus } from
  "@/modules/payments/domain/task-payment";
import { statusFromCircleState } from
  "@/modules/wallets/domain/wallet-transaction";
import { settleEscrow } from "./settle-escrow";

const POLL_DELAY_MS = 5_000;
const ACTIVE_PAYMENT_STATES = [
  "approval_pending",
  "escrow_pending",
  "locked",
  "charge_pending",
  "refund_pending",
] as const;

type Payment = Awaited<ReturnType<typeof pendingPayments>>[number];

function message(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : "Payment processing failed";
}

async function pendingPayments(limit: number) {
  return db
    .select({
      payment: taskPayments,
      taskStatus: tasks.status,
      walletAddress: wallets.address,
      circleWalletId: wallets.circleWalletId,
    })
    .from(taskPayments)
    .innerJoin(tasks, eq(tasks.id, taskPayments.taskId))
    .innerJoin(wallets, eq(wallets.id, taskPayments.walletId))
    .where(
      and(
        inArray(taskPayments.status, [...ACTIVE_PAYMENT_STATES]),
        lte(
          taskPayments.updatedAt,
          new Date(Date.now() - POLL_DELAY_MS)
        )
      )
    )
    .orderBy(asc(taskPayments.updatedAt))
    .limit(limit);
}

export async function processTaskPayments(limit = 10) {
  const payments = await pendingPayments(limit);

  for (const payment of payments) {
    try {
      await processPayment(payment);
    } catch (error) {
      await db
        .update(taskPayments)
        .set({ error: message(error), updatedAt: new Date() })
        .where(eq(taskPayments.id, payment.payment.id));
    }
  }

  return payments.length;
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
  } else if (status === "failed") {
    await failPayment(context, "APPROVAL_FAILED", circleFailure(remote));
  } else {
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
    return;
  }

  const remote = await getCircleTransaction(
    context.payment.escrowCircleTransactionId
  );
  const status = statusFromCircleState(remote.state);
  if (status === "failed") {
    await failPayment(context, "ESCROW_FAILED", circleFailure(remote));
    return;
  }
  if (status !== "confirmed") {
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
    throw new Error("Confirmed escrow does not match the intended client and amount");
  }

  const now = new Date();
  await db.transaction(async (transaction) => {
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
    }).onConflictDoNothing();
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
  const result = await settleEscrow({
    escrowId: context.payment.escrowId as `0x${string}`,
    kind,
  });
  const now = new Date();
  const finalKind = result.outcome;
  await db.transaction(async (transaction) => {
    await transaction.update(taskPayments).set({
      status: finalKind === "charge" ? "charged" : "refunded",
      settlementTxHash: result.hash,
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
  });
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
  });
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
