import "server-only";

import {
  encodeFunctionData,
  isAddress,
} from "viem";
import { eq, sql } from "drizzle-orm";
import {
  agents,
  tasks,
  userAgents,
  walletLocks,
  wallets,
} from "@/db/schema";
import { db } from "@/lib/db";
import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import { circle } from "@/lib/circle";
import {
  ESCROW_ADDRESS,
  publicClient,
} from "@/platform/blockchain/arc";
import {
  forbidden,
  invalidInput,
  notFound,
} from "@/shared/errors/application-error";
import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";
import type { CreateTaskInput } from
  "./parse-create-task";

export async function createPaidTask(
  userId: string,
  input: CreateTaskInput
) {
  const [worker] = await db
    .select()
    .from(userAgents)
    .where(eq(userAgents.id, input.userAgentId))
    .limit(1);

  if (!worker) {
    throw notFound("Worker not found");
  }

  if (worker.userId !== userId) {
    throw forbidden("Worker does not belong to this user");
  }

  if (worker.status !== "active") {
    throw invalidInput("Worker is not active");
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, worker.agentId))
    .limit(1);

  if (!agent) {
    throw notFound("Agent not found");
  }

  if (agent.pricingModel !== "task" || !agent.taskPrice) {
    throw invalidInput(
      "This agent does not support fixed-price tasks"
    );
  }

  let price;

  try {
    price = parsePositiveUsdc(agent.taskPrice);
  } catch {
    throw invalidInput("Agent has an invalid task price");
  }

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (!wallet) {
    throw notFound("Wallet not found");
  }

  if (
    wallet.status !== "active" ||
    !wallet.address ||
    !isAddress(wallet.address)
  ) {
    throw invalidInput("Wallet is not active");
  }

  // Temporary allocator. Phase 6 will replace this with a database
  // sequence or deterministic bytes32 identifier.
  const [nextEscrowId] = await db
    .select({
      value: sql<number>`
        coalesce(max(${tasks.escrowTaskId}), 0) + 1
      `,
    })
    .from(tasks);

  const escrowTaskId = nextEscrowId.value;
  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      userAgentId: input.userAgentId,
      escrowTaskId,
      title: input.title,
      prompt: input.prompt,
      priority: input.priority,
      status: "escrow_pending",
    })
    .returning();

  const calldata = encodeFunctionData({
    abi: escrowAbi,
    functionName: "createTaskEscrow",
    args: [
      BigInt(escrowTaskId),
      wallet.address,
      price.microUsdc,
    ],
  });

  const nonce = await publicClient.getTransactionCount({
    address: wallet.address,
  });
  const gas = await publicClient.estimateGas({
    account: wallet.address,
    to: ESCROW_ADDRESS as `0x${string}`,
    data: calldata,
  });
  const fees = await publicClient.estimateFeesPerGas();

  if (
    fees.maxFeePerGas === undefined ||
    fees.maxPriorityFeePerGas === undefined
  ) {
    throw new Error("Arc RPC did not return EIP-1559 fees");
  }

  const transaction = {
    chainId: publicClient.chain.id,
    nonce: nonce.toString(),
    to: ESCROW_ADDRESS,
    value: "0",
    gas: gas.toString(),
    maxFeePerGas: fees.maxFeePerGas.toString(),
    maxPriorityFeePerGas:
      fees.maxPriorityFeePerGas.toString(),
    data: calldata,
  };

  const signed = await circle.signTransaction({
    walletId: wallet.circleWalletId,
    transaction: JSON.stringify(transaction),
  });

  if (!signed.data?.signedTransaction) {
    throw new Error(
      "Circle did not return a signed transaction"
    );
  }

  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction:
      signed.data.signedTransaction as `0x${string}`,
  });
  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

  if (receipt.status !== "success") {
    throw new Error("Escrow transaction failed");
  }

  await db.transaction(async (transactionDb) => {
    await transactionDb
      .update(tasks)
      .set({ status: "queued" })
      .where(eq(tasks.id, task.id));

    await transactionDb.insert(walletLocks).values({
      walletId: wallet.id,
      taskId: task.id,
      escrowTaskId,
      txHash,
      amount: price.decimal,
      status: "ACTIVE",
    });
  });

  return {
    task: {
      ...task,
      status: "queued",
    },
    escrow: {
      escrowTaskId,
      txHash,
      amount: price.decimal,
    },
  };
}

