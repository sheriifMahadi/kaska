import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { formatUnits, type Address } from "viem";

import { walletLocks } from "@/db/schema";
import { usdcAbi } from "@/lib/abi/usdc";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import {
  ARC_TESTNET_USDC,
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import {
  formatUsdc,
  parseUsdc,
} from "@/modules/payments/domain/usdc";
import { calculateWalletBalance } from
  "@/modules/wallets/domain/wallet-balance";

export type GetWalletBalanceInput = {
  walletId: string;
  circleWalletId: string;
  walletAddress: Address;
};

export async function getWalletBalance({
  walletId,
  circleWalletId,
  walletAddress,
}: GetWalletBalanceInput) {
  const [circleBalance, spendApprovalMicroUsdc, committedResult] =
    await Promise.all([
      circle.getWalletTokenBalance({
        id: circleWalletId,
      }),
      publicClient.readContract({
        address: ARC_TESTNET_USDC as Address,
        abi: usdcAbi,
        functionName: "allowance",
        args: [walletAddress, ESCROW_ADDRESS as Address],
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
    spendApproval: formatUnits(spendApprovalMicroUsdc, 6),
    consistent: balance.consistent,
  };
}
