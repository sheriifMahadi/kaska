import "server-only";

import {
  encodeFunctionData,
  type Address,
} from "viem";
import { usdcAbi } from "@/lib/abi/usdc";
import {
  ARC_TESTNET_USDC,
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import { sendWalletTransaction } from
  "@/platform/circle/send-wallet-transaction";

type EnsureEscrowAllowanceInput = {
  walletId: string;
  walletAddress: Address;
  amount: bigint;
};

export async function ensureEscrowAllowance({
  walletId,
  walletAddress,
  amount,
}: EnsureEscrowAllowanceInput) {
  const allowance = await publicClient.readContract({
    address: ARC_TESTNET_USDC as Address,
    abi: usdcAbi,
    functionName: "allowance",
    args: [
      walletAddress,
      ESCROW_ADDRESS as Address,
    ],
  });

  if (allowance >= amount) {
    return null;
  }

  const data = encodeFunctionData({
    abi: usdcAbi,
    functionName: "approve",
    args: [ESCROW_ADDRESS as Address, amount],
  });

  return sendWalletTransaction({
    walletId,
    account: walletAddress,
    to: ARC_TESTNET_USDC as Address,
    data,
  });
}

