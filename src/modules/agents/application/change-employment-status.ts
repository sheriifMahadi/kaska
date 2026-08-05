import "server-only";

import { and, eq } from "drizzle-orm";

import { agents, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  canTransitionEmployment,
  type EmploymentStatus,
} from "@/modules/agents/domain/agent";
import {
  conflict,
  notFound,
} from "@/shared/errors/application-error";

export async function changeEmploymentStatus(
  userId: string,
  employmentId: string,
  nextStatus: EmploymentStatus
) {
  return db.transaction(async (transaction) => {
    const [employment] = await transaction
      .select({
        id: userAgents.id,
        status: userAgents.status,
        agentActive: agents.isActive,
      })
      .from(userAgents)
      .innerJoin(agents, eq(agents.id, userAgents.agentId))
      .where(
        and(
          eq(userAgents.id, employmentId),
          eq(userAgents.userId, userId)
        )
      )
      .limit(1)
      .for("update", { of: userAgents });

    if (!employment) throw notFound("Employment not found");

    if (!canTransitionEmployment(employment.status, nextStatus)) {
      throw conflict(
        employment.status === "archived"
          ? "Archived employment cannot be reactivated"
          : `Employment is already ${employment.status}`
      );
    }

    if (nextStatus === "active" && !employment.agentActive) {
      throw conflict("Inactive agents cannot be activated");
    }

    const now = new Date();
    const [updated] = await transaction
      .update(userAgents)
      .set({
        status: nextStatus,
        pausedAt: nextStatus === "paused" ? now : null,
        archivedAt: nextStatus === "archived" ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(userAgents.id, employmentId),
          eq(userAgents.userId, userId),
          eq(userAgents.status, employment.status)
        )
      )
      .returning();

    if (!updated) {
      throw conflict("Employment changed during this request; try again");
    }

    return updated;
  });
}
