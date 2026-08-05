import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";

export function listEmployedAgents(userId: string) {
  return db
    .select({
      userAgentId: userAgents.id,
      createdAt: userAgents.createdAt,
      status: userAgents.status,
      totalSpent: sql<string>`coalesce((
        select sum(wallet_locks.amount)
        from wallet_locks
        inner join tasks on tasks.id = wallet_locks.task_id
        where tasks.user_agent_id = ${userAgents.id}
          and wallet_locks.status = 'CHARGED'
      ), 0)::text`,
      agentId: agents.id,
      name: agents.name,
      slug: agents.slug,
      description: agents.description,
      capabilities: agents.capabilities,
      pricingType: agents.pricingType,
      price: agents.price,
      supportsOneTime: agents.supportsOneTime,
      supportsRecurring: agents.supportsRecurring,
    })
    .from(userAgents)
    .innerJoin(
      agents,
      eq(userAgents.agentId, agents.id)
    )
    .where(
      and(
        eq(userAgents.userId, userId),
        eq(userAgents.status, "active")
      )
    );
}
