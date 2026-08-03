import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { walletLocks } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import {
  formatUsdc,
  parseUsdc,
} from "@/modules/payments/domain/usdc";
import { calculateWalletBalance } from
  "@/modules/wallets/domain/wallet-balance";

export type GetWalletBalanceInput = {
  walletId: string;
  circleWalletId: string;
};

export async function getWalletBalance({
  walletId,
  circleWalletId,
}: GetWalletBalanceInput) {
  const [circleBalance, committedResult] =
    await Promise.all([
      circle.getWalletTokenBalance({
        id: circleWalletId,
      }),
      db
        .select({
          amount: sql<string>`
            coalesce(sum(${walletLocks.amount}), 0)::text
          `,
        })
        .from(walletLocks)
        .where(
          and(
            eq(walletLocks.walletId, walletId),
            eq(walletLocks.status, "ACTIVE")
          )
        ),
    ]);

  const usdcBalance = circleBalance.data?.tokenBalances?.find(
    ({ token }) =>
      token.symbol?.toUpperCase() === "USDC" &&
      token.blockchain === "ARC-TESTNET"
  );
  const walletMicroUsdc = parseUsdc(
    usdcBalance?.amount ?? "0"
  ).microUsdc;

  const committedMicroUsdc = parseUsdc(
    committedResult[0]?.amount ?? "0"
  ).microUsdc;

  // The escrow contract has already moved committed USDC out of the
  // wallet. Add it back to describe all user funds controlled by Kaska.
  const totalMicroUsdc = walletMicroUsdc + committedMicroUsdc;
  const balance = calculateWalletBalance(
    totalMicroUsdc,
    committedMicroUsdc
  );

  return {
    currency: "USDC" as const,
    totalBalance: formatUsdc(balance.totalMicroUsdc),
    availableBalance: formatUsdc(balance.availableMicroUsdc),
    committedBalance: formatUsdc(balance.committedMicroUsdc),
    consistent: balance.consistent,
  };
}
