import { NextResponse } from "next/server";
import { formatUnits } from "viem";

import { circle } from "@/lib/circle";
import { usdcAbi } from "@/lib/abi/usdc";
import {
  ARC_TESTNET_USDC,
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import { requireActiveCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { wallet } = await requireActiveCurrentWallet();

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

      currency: "USDC",

      totalBalance,

      availableBalance: totalBalance,

      // Will come from the escrow contract later
      lockedBalance: "0",

      // Current approved spending limit
      spendApproval,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/balance");
  }
}
