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
      budget: userAgents.budget,
      completedTasks: userAgents.completedTasks,
      totalSpent: userAgents.totalSpent,
      agentId: agents.id,
      name: agents.name,
      description: agents.description,
      type: agents.type,
      pricingModel: agents.pricingModel,
      taskPrice: agents.taskPrice,
      hourlyRate: agents.hourlyRate,
    })
    .from(userAgents)
    .innerJoin(
      agents,
      eq(userAgents.agentId, agents.id)
    )
    .where(eq(userAgents.userId, userId));
}

