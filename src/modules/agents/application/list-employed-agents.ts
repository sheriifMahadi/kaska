import "server-only";

import { eq } from "drizzle-orm";
import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";

export function listEmployedAgents(userId: string) {
  return db
    .select({
      userAgentId: userAgents.id,
      createdAt: userAgents.createdAt,
      status: userAgents.status,
      perRunLimit: userAgents.perRunLimit,
      dailyLimit: userAgents.dailyLimit,
      monthlyLimit: userAgents.monthlyLimit,
      totalSpent: userAgents.totalSpent,
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
    .where(eq(userAgents.userId, userId));
}
