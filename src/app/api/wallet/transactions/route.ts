import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import {
  agents,
  taskPayments,
  tasks,
  userAgents,
  walletTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";
import { syncPendingWithdrawals } from
  "@/modules/wallets/application/sync-pending-withdrawals";

export async function GET() {
  try {
    const { user, wallet } = await requireCurrentWallet();
    await syncPendingWithdrawals(5, user.id);
    const [walletMovements, settledPayments] = await Promise.all([
      db
        .select({
          id: walletTransactions.id,
          type: walletTransactions.type,
          direction: walletTransactions.direction,
          status: walletTransactions.status,
          amount: walletTransactions.amount,
          currency: walletTransactions.currency,
          circleTransactionId:
            walletTransactions.circleTransactionId,
          txHash: walletTransactions.txHash,
          error: walletTransactions.error,
          source: walletTransactions.source,
          createdAt: walletTransactions.createdAt,
          confirmedAt: walletTransactions.confirmedAt,
          failedAt: walletTransactions.failedAt,
        })
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, user.id))
        .orderBy(desc(walletTransactions.createdAt)),
      db
        .select({
          id: taskPayments.id,
          amount: taskPayments.amount,
          status: taskPayments.status,
          txHash: taskPayments.settlementTxHash,
          settledAt: taskPayments.settledAt,
          agentName: agents.name,
        })
        .from(taskPayments)
        .innerJoin(tasks, eq(tasks.id, taskPayments.taskId))
        .innerJoin(userAgents, eq(userAgents.id, tasks.userAgentId))
        .innerJoin(agents, eq(agents.id, userAgents.agentId))
        .where(
          and(
            eq(taskPayments.walletId, wallet.id),
            inArray(taskPayments.status, ["charged", "refunded"])
          )
        )
        .orderBy(desc(taskPayments.settledAt)),
    ]);

    const refundAgentsByHash = new Map(
      settledPayments.flatMap((payment) =>
        payment.status === "refunded" && payment.txHash
          ? [[payment.txHash.toLowerCase(), payment.agentName] as const]
          : []
      )
    );
    const labeledWalletMovements = walletMovements.map((movement) => {
      const agentName = movement.txHash
        ? refundAgentsByHash.get(movement.txHash.toLowerCase())
        : undefined;
      return {
        ...movement,
        title: agentName ?? null,
        type: agentName ? "agent refunded" : movement.type,
      };
    });
    const existingRefundHashes = new Set(
      walletMovements.flatMap((movement) =>
        movement.txHash ? [movement.txHash.toLowerCase()] : []
      )
    );
    const taskSettlements = settledPayments.flatMap((payment) => {
      if (!payment.settledAt) return [];
      if (
        payment.status === "refunded" &&
        payment.txHash &&
        existingRefundHashes.has(payment.txHash.toLowerCase())
      ) {
        return [];
      }

      const refunded = payment.status === "refunded";
      return [{
            id: `task-${refunded ? "refund" : "charge"}-${payment.id}`,
            title: payment.agentName,
            type: refunded ? "agent refunded" : "agent charged",
            direction: refunded ? "credit" as const : "debit" as const,
            status: "confirmed" as const,
            amount: payment.amount,
            currency: "USDC",
            circleTransactionId: null,
            txHash: payment.txHash,
            error: null,
            source: "task_escrow",
            createdAt: payment.settledAt,
            confirmedAt: payment.settledAt,
            failedAt: null,
          }];
    });

    const transactions = [
      ...labeledWalletMovements,
      ...taskSettlements,
    ].sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime()
    );

    return NextResponse.json(transactions);
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/transactions");
  }
}
