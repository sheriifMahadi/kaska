import "server-only";

import { and, count, eq, gte, sql } from "drizzle-orm";

import { walletLocks, walletTransactions } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import {
  parseExternalUsdcBalance,
  parseUsdc,
} from "@/modules/payments/domain/usdc";
import type { WithdrawalRequest } from
  "@/modules/wallets/domain/withdrawal";
import { calculateWithdrawableMicroUsdc } from
  "@/modules/wallets/domain/withdrawal";
import {
  conflict,
  rateLimited,
} from "@/shared/errors/application-error";

type WalletContext = {
  userId: string;
  walletId: string;
  circleWalletId: string;
  walletAddress: string;
};

const WITHDRAWAL_WINDOW_MS = 10 * 60 * 1000;
const WITHDRAWAL_LIMIT = 3;

type CircleApiError = {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Array<{ message?: string }>;
    };
  };
};

function circleWithdrawalError(error: unknown) {
  const apiError = error as CircleApiError;
  const status = apiError.status ?? apiError.response?.status;
  const detail =
    apiError.response?.data?.errors?.[0]?.message ??
    apiError.response?.data?.message ??
    apiError.message;

  if (status === 400 || status === 422) {
    return conflict(
      detail && !/api parameter invalid/i.test(detail)
        ? `Withdrawal rejected by Circle: ${detail}`
        : "Withdrawal could not cover the transfer and Arc network fee. Reduce the amount and try again."
    );
  }

  return error;
}

export async function createWithdrawal(
  context: WalletContext,
  request: WithdrawalRequest
) {
  if (
    request.recipient.toLowerCase() ===
    context.walletAddress.toLowerCase()
  ) {
    throw conflict("The recipient cannot be your Kaska wallet");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${context.walletId}))`
    );

    const [existing] = await tx
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.userId, context.userId),
          eq(
            walletTransactions.idempotencyKey,
            request.idempotencyKey
          )
        )
      )
      .limit(1);

    if (existing) {
      if (
        parseUsdc(existing.amount).microUsdc !== request.microUsdc ||
        existing.toAddress?.toLowerCase() !==
          request.recipient.toLowerCase()
      ) {
        throw conflict("This withdrawal request ID was already used");
      }

      return {
        transactionId: existing.circleTransactionId,
        status: existing.status,
        duplicate: true,
      };
    }

    const since = new Date(Date.now() - WITHDRAWAL_WINDOW_MS);
    const [recent] = await tx
      .select({ value: count() })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.userId, context.userId),
          eq(walletTransactions.type, "withdrawal"),
          gte(walletTransactions.createdAt, since)
        )
      );

    if ((recent?.value ?? 0) >= WITHDRAWAL_LIMIT) {
      throw rateLimited(
        "You can make up to 3 withdrawals every 10 minutes"
      );
    }

    const [circleBalance, pendingResult, reservedResult] =
      await Promise.all([
        circle.getWalletTokenBalance({ id: context.circleWalletId }),
        tx
          .select({
            amount: sql<string>`coalesce(sum(${walletTransactions.amount}), 0)::text`,
          })
          .from(walletTransactions)
          .where(
            and(
              eq(walletTransactions.walletId, context.walletId),
              eq(walletTransactions.type, "withdrawal"),
              eq(walletTransactions.status, "pending")
            )
          ),
        tx
          .select({
            amount: sql<string>`coalesce(sum(${walletLocks.amount}), 0)::text`,
          })
          .from(walletLocks)
          .where(and(
            eq(walletLocks.walletId, context.walletId),
            eq(walletLocks.status, "RESERVED")
          )),
      ]);

    const usdc = circleBalance.data?.tokenBalances?.find(
      ({ token }) =>
        token.symbol?.toUpperCase() === "USDC" &&
        token.blockchain === "ARC-TESTNET"
    );

    if (!usdc?.token.id) {
      throw conflict("Arc Testnet USDC is not available in this wallet");
    }

    const liquid = parseExternalUsdcBalance(
      usdc?.amount ?? "0"
    ).microUsdc;
    const pending = parseUsdc(
      pendingResult[0]?.amount ?? "0"
    ).microUsdc;
    const reserved = parseUsdc(
      reservedResult[0]?.amount ?? "0"
    ).microUsdc;

    // Escrow funds have already left the wallet, so Circle's liquid balance
    // cannot include them. Pending withdrawals are reserved until synced.
    const withdrawable = calculateWithdrawableMicroUsdc(
      liquid,
      pending,
      reserved
    );

    if (request.microUsdc > withdrawable) {
      throw conflict("Withdrawal exceeds your available USDC balance");
    }

    let estimatedFeeMicroUsdc = 0n;
    try {
      const estimate = await circle.estimateTransferFee({
        walletId: context.circleWalletId,
        tokenId: usdc.token.id,
        destinationAddress: request.recipient,
        amount: [request.amount],
      });
      const estimatedFee = estimate.data?.medium?.networkFee;

      if (estimatedFee) {
        estimatedFeeMicroUsdc = parseExternalUsdcBalance(
          estimatedFee
        ).microUsdc;
      }
    } catch (error) {
      throw circleWithdrawalError(error);
    }

    if (request.microUsdc + estimatedFeeMicroUsdc > withdrawable) {
      throw conflict(
        "Leave enough USDC for the Arc network fee. Reduce the withdrawal amount and try again."
      );
    }

    await tx.insert(walletTransactions).values({
      walletId: context.walletId,
      userId: context.userId,
      type: "withdrawal",
      direction: "debit",
      status: "pending",
      amount: request.amount,
      idempotencyKey: request.idempotencyKey,
      source: "circle",
      fromAddress: context.walletAddress,
      toAddress: request.recipient,
    });

    let response;
    try {
      response = await circle.createTransaction({
        walletId: context.circleWalletId,
        tokenId: usdc.token.id,
        destinationAddress: request.recipient,
        amount: [request.amount],
        idempotencyKey: request.idempotencyKey,
        fee: {
          type: "level",
          config: { feeLevel: "MEDIUM" },
        },
      });
    } catch (error) {
      throw circleWithdrawalError(error);
    }
    const circleTransactionId = response.data?.id;

    if (!circleTransactionId) {
      throw new Error("Circle returned no transaction ID");
    }

    await tx
      .update(walletTransactions)
      .set({
        circleTransactionId,
        updatedAt: new Date(),
      })
      .where(
        eq(
          walletTransactions.idempotencyKey,
          request.idempotencyKey
        )
      );

    return {
      transactionId: circleTransactionId,
      status: "pending" as const,
      duplicate: false,
    };
  });
}
