import "server-only";

import { and, eq } from "drizzle-orm";

import { agents, tasks, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  invalidInput,
  notFound,
} from "@/shared/errors/application-error";
import type { CreateTaskInput } from "./parse-create-task";

export async function createTask(
  userId: string,
  input: CreateTaskInput
) {
  const [employment] = await db
    .select({
      id: userAgents.id,
      status: userAgents.status,
      agentActive: agents.isActive,
      supportsOneTime: agents.supportsOneTime,
    })
    .from(userAgents)
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(
      and(
        eq(userAgents.id, input.userAgentId),
        eq(userAgents.userId, userId)
      )
    )
    .limit(1);

  if (!employment) {
    throw notFound("Employed agent not found");
  }

  if (employment.status !== "active") {
    throw invalidInput("Employed agent is not active");
  }

  if (!employment.agentActive || !employment.supportsOneTime) {
    throw invalidInput("This agent does not accept one-time tasks");
  }

  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      userAgentId: employment.id,
      title: input.title,
      prompt: input.prompt,
      priority: input.priority,
      status: "queued",
    })
    .returning();

  return { task };
}
