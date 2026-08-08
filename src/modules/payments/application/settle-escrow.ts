import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import {
  ESCROW_ADDRESS,
  arcTestnet,
  publicClient,
} from "@/platform/blockchain/arc";
import { serverConfig } from "@/platform/config/server";

type SettleEscrowInput = {
  escrowId: `0x${string}`;
  kind: "charge" | "refund";
};

export async function settleEscrow({ escrowId, kind }: SettleEscrowInput) {
  const escrow = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "escrows",
    args: [escrowId],
  });
  const status = Number(escrow[4]);
  const expected = kind === "charge" ? 3 : 2;

  // This makes a repeated worker attempt safe when the first transaction was
  // mined but the process stopped before its hash was stored.
  if (status === expected) return { hash: null, outcome: kind };
  if (status === 2) return { hash: null, outcome: "refund" as const };
  if (status === 3) return { hash: null, outcome: "charge" as const };
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
  const expired = BigInt(Math.floor(Date.now() / 1_000)) >= escrow[3];
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
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Escrow settlement reverted");
  return {
    hash,
    outcome:
      functionName === "chargeEscrow"
        ? "charge" as const
        : "refund" as const,
  };
}
