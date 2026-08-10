import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import { hasAgentExecutionProfile } from
  "@/core/execution/agent-execution-profiles";

const marketplaceSelection = {
  id: agents.id,
  name: agents.name,
  slug: agents.slug,
  isActive: agents.isActive,
  description: agents.description,
  capabilities: agents.capabilities,
  pricingType: agents.pricingType,
  price: agents.price,
  supportsOneTime: agents.supportsOneTime,
  supportsRecurring: agents.supportsRecurring,
  employmentId: userAgents.id,
  employmentStatus: userAgents.status,
};

export async function listMarketplaceAgents(userId: string) {
  const catalog = await db
    .select(marketplaceSelection)
    .from(agents)
    .leftJoin(
      userAgents,
      and(
        eq(userAgents.agentId, agents.id),
        eq(userAgents.userId, userId)
      )
    )
    .orderBy(asc(agents.name));

  return catalog.map(toMarketplaceAgent);
}

export async function getMarketplaceAgentBySlug(
  userId: string,
  slug: string
) {
  const [agent] = await db
    .select(marketplaceSelection)
    .from(agents)
    .leftJoin(
      userAgents,
      and(
        eq(userAgents.agentId, agents.id),
        eq(userAgents.userId, userId)
      )
    )
    .where(eq(agents.slug, slug))
    .limit(1);

  return agent ? toMarketplaceAgent(agent) : null;
}

function toMarketplaceAgent<T extends { isActive: boolean; slug: string }>(
  agent: T
) {
  return {
    ...agent,
    isAvailable:
      agent.isActive && hasAgentExecutionProfile(agent.slug),
  };
}
