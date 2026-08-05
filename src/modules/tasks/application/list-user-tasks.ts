import "server-only";

import { desc, eq } from "drizzle-orm";
import {
  agents,
  tasks,
  userAgents,
} from "@/db/schema";
import { db } from "@/lib/db";

export function listUserTasks(userId: string) {
  return db
    .select({
      id: tasks.id,
      escrowTaskId: tasks.escrowTaskId,
      title: tasks.title,
      prompt: tasks.prompt,
      priority: tasks.priority,
      status: tasks.status,
      createdAt: tasks.createdAt,
      startedAt: tasks.startedAt,
      completedAt: tasks.completedAt,
      userAgentId: userAgents.id,
      agentId: agents.id,
      agentName: agents.name,
      agentType: agents.slug,
    })
    .from(tasks)
    .innerJoin(
      userAgents,
      eq(tasks.userAgentId, userAgents.id)
    )
    .innerJoin(
      agents,
      eq(userAgents.agentId, agents.id)
    )
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));
}
