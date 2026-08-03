import { eq } from "drizzle-orm";

import { wallets, walletTransactions } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import { parseExternalUsdcBalance } from
  "@/modules/payments/domain/usdc";
import { statusFromCircleState } from
  "@/modules/wallets/domain/wallet-transaction";

const RECONCILIATION_INTERVAL_MS = 30_000;
let nextReconciliationAt = 0;

export async function reconcileCircleTransactions(limit = 10) {
  const now = Date.now();

  if (now < nextReconciliationAt) return 0;
  nextReconciliationAt = now + RECONCILIATION_INTERVAL_MS;

  const activeWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.status, "active"))
    .limit(limit);
  let reconciled = 0;

  for (const wallet of activeWallets) {
    if (!wallet.circleWalletId || !wallet.address) continue;

    try {
      const balanceResponse = await circle.getWalletTokenBalance({
        id: wallet.circleWalletId,
      });
      const usdc = balanceResponse.data?.tokenBalances?.find(
        ({ token }) =>
          token.symbol?.toUpperCase() === "USDC" &&
          token.blockchain === "ARC-TESTNET"
      );

      if (!usdc?.token.id) continue;

      const response = await circle.listTransactions({
        walletIds: [wallet.circleWalletId],
        pageSize: 50,
        order: "DESC",
      });

      for (const remote of response.data?.transactions ?? []) {
        if (
          remote.blockchain !== "ARC-TESTNET" ||
          remote.operation !== "TRANSFER" ||
          remote.tokenId !== usdc.token.id ||
          !remote.amounts?.[0]
        ) {
          continue;
        }

        const amount = parseExternalUsdcBalance(remote.amounts[0]);
        if (amount.microUsdc === 0n) continue;

        const type =
          remote.transactionType === "INBOUND"
            ? "deposit" as const
            : "withdrawal" as const;
        const status = statusFromCircleState(remote.state);
        const terminalAt = remote.firstConfirmDate
          ? new Date(remote.firstConfirmDate)
          : new Date(remote.updateDate);
        const failure = [remote.errorReason, remote.errorDetails]
          .filter(Boolean)
          .join(": ");

        await db
          .insert(walletTransactions)
          .values({
            walletId: wallet.id,
            userId: wallet.userId,
            type,
            direction: type === "deposit" ? "credit" : "debit",
            status,
            amount: amount.decimal,
            circleTransactionId: remote.id,
            txHash: remote.txHash ?? null,
            blockNumber: remote.blockHeight ?? null,
            fromAddress: remote.sourceAddress ?? null,
            toAddress: remote.destinationAddress ?? null,
            error: status === "failed" ? failure || remote.state : null,
            source: "circle",
            createdAt: new Date(remote.createDate),
            updatedAt: new Date(remote.updateDate),
            confirmedAt: status === "confirmed" ? terminalAt : null,
            failedAt: status === "failed" ? terminalAt : null,
          })
          .onConflictDoUpdate({
            target: walletTransactions.circleTransactionId,
            setWhere: eq(walletTransactions.status, "pending"),
            set: {
              status,
              txHash: remote.txHash ?? null,
              blockNumber: remote.blockHeight ?? null,
              error:
                status === "failed" ? failure || remote.state : null,
              updatedAt: new Date(remote.updateDate),
              confirmedAt:
                status === "confirmed" ? terminalAt : null,
              failedAt: status === "failed" ? terminalAt : null,
            },
          });
        reconciled += 1;
      }
    } catch (error) {
      console.error(
        `Circle reconciliation failed for wallet ${wallet.id}`,
        error
      );
    }
  }

  return reconciled;
}
