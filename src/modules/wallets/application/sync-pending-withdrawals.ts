import { and, asc, eq, isNotNull, lte } from "drizzle-orm";

import { walletTransactions } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import { statusFromCircleState } from
  "@/modules/wallets/domain/wallet-transaction";

const SYNC_INTERVAL_MS = 5_000;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : "Circle transaction synchronization failed";
}

export async function syncPendingWithdrawals(
  limit = 10,
  userId?: string
) {
  const eligibleBefore = new Date(Date.now() - SYNC_INTERVAL_MS);
  const pending = await db
    .select({
      id: walletTransactions.id,
      circleTransactionId: walletTransactions.circleTransactionId,
    })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.type, "withdrawal"),
        eq(walletTransactions.status, "pending"),
        isNotNull(walletTransactions.circleTransactionId),
        lte(walletTransactions.updatedAt, eligibleBefore),
        userId ? eq(walletTransactions.userId, userId) : undefined
      )
    )
    .orderBy(asc(walletTransactions.updatedAt))
    .limit(limit);

  for (const local of pending) {
    if (!local.circleTransactionId) continue;

    try {
      const response = await circle.getTransaction({
        id: local.circleTransactionId,
      });
      const remote = response.data?.transaction;

      if (!remote) throw new Error("Circle returned no transaction");

      const status = statusFromCircleState(remote.state);
      const now = new Date();
      const failure = [remote.errorReason, remote.errorDetails]
        .filter(Boolean)
        .join(": ");

      await db
        .update(walletTransactions)
        .set({
          status,
          txHash: remote.txHash ?? null,
          blockNumber: remote.blockHeight ?? null,
          error: status === "failed" ? failure || remote.state : null,
          confirmedAt:
            status === "confirmed"
              ? remote.firstConfirmDate
                ? new Date(remote.firstConfirmDate)
                : now
              : null,
          failedAt: status === "failed" ? now : null,
          updatedAt: now,
        })
        .where(
          and(
            eq(walletTransactions.id, local.id),
            eq(walletTransactions.status, "pending")
          )
        );
    } catch (error) {
      await db
        .update(walletTransactions)
        .set({ error: errorMessage(error), updatedAt: new Date() })
        .where(
          and(
            eq(walletTransactions.id, local.id),
            eq(walletTransactions.status, "pending")
          )
        );
    }
  }

  return pending.length;
}
