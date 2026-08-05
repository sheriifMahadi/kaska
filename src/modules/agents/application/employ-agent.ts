import "server-only";

import { eq } from "drizzle-orm";
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
  return db.transaction(async (transaction) => {
    const [agent] = await transaction
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1)
      .for("share");

    if (!agent || !agent.isActive) {
      throw notFound("Agent not found");
    }

    const [employment] = await transaction
      .insert(userAgents)
      .values({ userId, agentId })
      .onConflictDoNothing({
        target: [userAgents.userId, userAgents.agentId],
      })
      .returning();

    if (!employment) {
      throw conflict("Agent already employed");
    }

    return employment;
  });
}
