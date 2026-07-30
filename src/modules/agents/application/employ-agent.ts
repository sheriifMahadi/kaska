import "server-only";

import { and, eq } from "drizzle-orm";
import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  conflict,
  notFound,
} from "@/shared/errors/application-error";

export async function employAgent(
  userId: string,
  agentId: string
) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent || !agent.isActive) {
    throw notFound("Agent not found");
  }

  const [existing] = await db
    .select({ id: userAgents.id })
    .from(userAgents)
    .where(
      and(
        eq(userAgents.userId, userId),
        eq(userAgents.agentId, agentId)
      )
    )
    .limit(1);

  if (existing) {
    throw conflict("Agent already employed");
  }

  const [employment] = await db
    .insert(userAgents)
    .values({ userId, agentId })
    .returning();

  return employment;
}

