import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import {
  ESCROW_ADDRESS,
  arcTestnet,
  publicClient,
} from "@/platform/blockchain/arc";
import { serverConfig } from "@/platform/config/server";

type EscrowSettlementInput = {
  escrowId: `0x${string}`;
  kind: "charge" | "refund";
};

export async function inspectEscrowSettlement(escrowId: `0x${string}`) {
  const escrow = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "escrows",
    args: [escrowId],
  });
  const status = Number(escrow[4]);
  return {
    status,
    expiresAt: escrow[3],
    outcome:
      status === 2
        ? "refund" as const
        : status === 3
          ? "charge" as const
          : null,
  };
}

export async function submitEscrowSettlement({
  escrowId,
  kind,
}: EscrowSettlementInput) {
  const escrow = await inspectEscrowSettlement(escrowId);
  const status = escrow.status;
  if (status !== 1) {
    throw new Error(`Escrow has incompatible on-chain status ${status}`);
  }

  const account = privateKeyToAccount(serverConfig.settlementPrivateKey);
  const hasRole = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "hasRole",
    args: [
      await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "SETTLEMENT_ROLE",
      }),
      account.address,
    ],
  });
  if (!hasRole) throw new Error("Configured settlement signer lacks SETTLEMENT_ROLE");

  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(serverConfig.arcRpcUrl),
  });
  const expired =
    BigInt(Math.floor(Date.now() / 1_000)) >= escrow.expiresAt;
  const functionName =
    kind === "charge" && expired
      ? "refundExpiredEscrow"
      : kind === "charge"
        ? "chargeEscrow"
        : "refundEscrow";
  const hash = await client.writeContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName,
    args: [escrowId],
  });
  return {
    hash,
    outcome:
      functionName === "chargeEscrow"
        ? "charge" as const
        : "refund" as const,
  };
}
