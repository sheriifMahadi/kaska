import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  agents,
  userAgents,
} from "@/db/schema";
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
import { persistPaidTask } from "./persist-paid-task";

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
  const task = await db.transaction(async (transaction) => {
    // Serialize task reservations with withdrawals from this wallet.
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${wallet.id}))`
    );
    return persistPaidTask(transaction, {
      userId,
      userAgentId: employment.id,
      walletId: wallet.id,
      title: input.title,
      prompt: input.prompt,
      priority: input.priority,
      price: price.decimal,
    });
  });

  return { task };
}
