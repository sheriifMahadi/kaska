import "server-only";

import type { Address, Hex } from "viem";
import { circle } from "@/lib/circle";
import { publicClient } from
  "@/platform/blockchain/arc";

type SendWalletTransactionInput = {
  walletId: string;
  account: Address;
  to: Address;
  data: Hex;
};

export async function sendWalletTransaction({
  walletId,
  account,
  to,
  data,
}: SendWalletTransactionInput) {
  const nonce = await publicClient.getTransactionCount({
    address: account,
  });
  const gas = await publicClient.estimateGas({
    account,
    to,
    data,
  });
  const fees = await publicClient.estimateFeesPerGas();

  if (
    fees.maxFeePerGas === undefined ||
    fees.maxPriorityFeePerGas === undefined
  ) {
    throw new Error("Arc RPC did not return EIP-1559 fees");
  }

  const signed = await circle.signTransaction({
    walletId,
    transaction: JSON.stringify({
      chainId: publicClient.chain.id,
      nonce: nonce.toString(),
      to,
      value: "0",
      gas: gas.toString(),
      maxFeePerGas: fees.maxFeePerGas.toString(),
      maxPriorityFeePerGas:
        fees.maxPriorityFeePerGas.toString(),
      data,
    }),
  });

  if (!signed.data?.signedTransaction) {
    throw new Error(
      "Circle did not return a signed transaction"
    );
  }

  const hash = await publicClient.sendRawTransaction({
    serializedTransaction:
      signed.data.signedTransaction as Hex,
  });
  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash,
    });

  if (receipt.status !== "success") {
    throw new Error("Arc transaction reverted");
  }

  return { hash, receipt };
}

