import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { formatUnits } from "viem";

import { db } from "@/lib/db";
import { circle } from "@/lib/circle";
import { usdcAbi } from "@/lib/abi/usdc";
import {
  ARC_TESTNET_USDC,
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import { users, wallets } from "@/db/schema";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // =========================
  // GET USER
  // =========================

  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // =========================
  // GET WALLET
  // =========================

  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .then((r) => r[0]);

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found" },
      { status: 404 }
    );
  }

  // =========================
  // GET CIRCLE BALANCE
  // =========================

  const balanceResponse =
    await circle.getWalletTokenBalance({
      id: wallet.circleWalletId,
    });

  const usdc =
    balanceResponse.data?.tokenBalances?.find(
      (tokenBalance) =>
        tokenBalance.token.symbol === "USDC" &&
        tokenBalance.token.standard === "ERC20"
    );

  const totalBalance = usdc?.amount ?? "0";

  // =========================
  // GET ERC20 ALLOWANCE
  // =========================

  const allowance = await publicClient.readContract({
    address: ARC_TESTNET_USDC as `0x${string}`,
    abi: usdcAbi,
    functionName: "allowance",
    args: [
      wallet.address as `0x${string}`,
      ESCROW_ADDRESS as `0x${string}`,
    ],
  });

  const spendApproval = formatUnits(
    allowance,
    6 // USDC decimals
  );

  // =========================
  // RESPONSE
  // =========================

  return NextResponse.json({
    address: wallet.address,
    walletId: wallet.circleWalletId,

    currency: "USDC",

    totalBalance,

    availableBalance: totalBalance,

    // Will come from the escrow contract later
    lockedBalance: "0",

    // Current approved spending limit
    spendApproval,
  });
}
