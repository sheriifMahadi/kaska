import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";

const marketplaceSelection = {
  id: agents.id,
  name: agents.name,
  slug: agents.slug,
  description: agents.description,
  capabilities: agents.capabilities,
  pricingType: agents.pricingType,
  price: agents.price,
  supportsOneTime: agents.supportsOneTime,
  supportsRecurring: agents.supportsRecurring,
  employmentId: userAgents.id,
  employmentStatus: userAgents.status,
};

export function listMarketplaceAgents(userId: string) {
  return db
    .select(marketplaceSelection)
    .from(agents)
    .leftJoin(
      userAgents,
      and(
        eq(userAgents.agentId, agents.id),
        eq(userAgents.userId, userId)
      )
    )
    .where(eq(agents.isActive, true))
    .orderBy(asc(agents.name));
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
    .where(and(eq(agents.slug, slug), eq(agents.isActive, true)))
    .limit(1);

  return agent ?? null;
}
