import { encodeFunctionData } from "viem";

import { circle } from "@/lib/circle";
import {
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";

import { escrowAbi } from "@/lib/abi/kaskaEscrow";

type CreateEscrowParams = {
  walletId: string;
  taskId: number;
  client: `0x${string}`;
  amount: bigint;
};

export async function createTaskEscrow({
  walletId,
  taskId,
  client,
  amount,
}: CreateEscrowParams) {
  const data = encodeFunctionData({
    abi: escrowAbi,
    functionName: "createTaskEscrow",
    args: [BigInt(taskId), client, amount],
  });

  // Build transaction
  const tx = {
    to: ESCROW_ADDRESS,
    data,
    value: "0x0",
  };

  // Sign using Circle Developer Controlled Wallet
  const signed = await circle.signTransaction({
    walletId,
    transaction: JSON.stringify(tx),
  });

  if (!signed.data?.signedTransaction) {
    throw new Error("Circle did not return a signed transaction");
  }

  // Broadcast
  const hash = await publicClient.sendRawTransaction({
    serializedTransaction:
      signed.data.signedTransaction as `0x${string}`,
  });

  return hash;
}
