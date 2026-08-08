import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { keccak256, stringToHex } from "viem";

import { agents, taskPayments, tasks, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import { requireActiveUserWallet } from
  "@/modules/identity/application/current-wallet";
import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";
import {
  invalidInput,
  notFound,
} from "@/shared/errors/application-error";
import type { CreateTaskInput } from "./parse-create-task";

export async function createTask(
  userId: string,
  input: CreateTaskInput
) {
  const [employment] = await db
    .select({
      id: userAgents.id,
      status: userAgents.status,
      agentActive: agents.isActive,
      supportsOneTime: agents.supportsOneTime,
      price: agents.price,
    })
    .from(userAgents)
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(
      and(
        eq(userAgents.id, input.userAgentId),
        eq(userAgents.userId, userId)
      )
    )
    .limit(1);

  if (!employment) {
    throw notFound("Employed agent not found");
  }

  if (employment.status !== "active") {
    throw invalidInput("Employed agent is not active");
  }

  if (!employment.agentActive || !employment.supportsOneTime) {
    throw invalidInput("This agent does not accept one-time tasks");
  }

  let price;
  try {
    price = parsePositiveUsdc(employment.price);
  } catch {
    throw invalidInput("This agent has an invalid task price");
  }

  const wallet = await requireActiveUserWallet(userId);
  const taskId = randomUUID();
  const escrowId = keccak256(stringToHex(taskId));

  const task = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(tasks)
      .values({
        id: taskId,
        userId,
        userAgentId: employment.id,
        escrowTaskId: escrowId,
        title: input.title,
        prompt: input.prompt,
        priority: input.priority,
        status: "draft",
      })
      .returning();

    await transaction.insert(taskPayments).values({
      taskId,
      walletId: wallet.id,
      escrowId,
      amount: price.decimal,
      status: "approval_pending",
      approvalIdempotencyKey: randomUUID(),
      escrowIdempotencyKey: randomUUID(),
      settlementIdempotencyKey: randomUUID(),
    });

    return created;
  });

  return { task };
}
