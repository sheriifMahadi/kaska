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

    const [existingEmployment] = await transaction
      .select()
      .from(userAgents)
      .where(
        and(
          eq(userAgents.userId, userId),
          eq(userAgents.agentId, agentId)
        )
      )
      .limit(1)
      .for("update");

    if (existingEmployment?.status === "active") {
      throw conflict("Agent already employed");
    }

    if (existingEmployment?.status === "archived") {
      const [reactivated] = await transaction
        .update(userAgents)
        .set({
          status: "active",
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(userAgents.id, existingEmployment.id))
        .returning();

      return reactivated;
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
