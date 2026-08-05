import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { agents } from "@/db/schema";
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
};

export function listMarketplaceAgents() {
  return db
    .select(marketplaceSelection)
    .from(agents)
    .where(eq(agents.isActive, true))
    .orderBy(asc(agents.name));
}

export async function getMarketplaceAgentBySlug(slug: string) {
  const [agent] = await db
    .select(marketplaceSelection)
    .from(agents)
    .where(and(eq(agents.slug, slug), eq(agents.isActive, true)))
    .limit(1);

  return agent ?? null;
}
