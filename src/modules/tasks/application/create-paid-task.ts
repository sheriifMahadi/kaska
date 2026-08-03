import "server-only";

import {
  encodeFunctionData,
} from "viem";
import { eq, sql } from "drizzle-orm";
import {
  agents,
  tasks,
  userAgents,
  walletLocks,
} from "@/db/schema";
import { db } from "@/lib/db";
import { escrowAbi } from "@/lib/abi/kaskaEscrow";
import {
  ESCROW_ADDRESS,
} from "@/platform/blockchain/arc";
import { sendWalletTransaction } from
  "@/platform/circle/send-wallet-transaction";
import { ensureEscrowAllowance } from
  "@/modules/payments/application/ensure-escrow-allowance";
import {
  forbidden,
  invalidInput,
  notFound,
} from "@/shared/errors/application-error";
import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";
import type { CreateTaskInput } from
  "./parse-create-task";
import { requireActiveUserWallet } from
  "@/modules/identity/application/current-wallet";

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

  const wallet = await requireActiveUserWallet(userId);

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
      price.microUsdc,
    ],
  });

  let txHash: `0x${string}`;

  try {
    await ensureEscrowAllowance({
      walletId: wallet.circleWalletId,
      walletAddress: wallet.address,
      amount: price.microUsdc,
    });

    const transaction = await sendWalletTransaction({
      walletId: wallet.circleWalletId,
      account: wallet.address,
      to: ESCROW_ADDRESS as `0x${string}`,
      data: calldata,
    });

    txHash = transaction.hash;
  } catch (error) {
    await db
      .update(tasks)
      .set({
        status: "escrow_failed",
        error:
          error instanceof Error
            ? error.message
            : "Escrow transaction failed",
      })
      .where(eq(tasks.id, task.id));

    throw error;
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
