import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { conflict, notFound } from "@/shared/errors/application-error";

export async function cancelTask(userId: string, taskId: string) {
  const now = new Date();
  const [cancelled] = await db
    .update(tasks)
    .set({
      status: "cancelled",
      cancelledAt: now,
      nextAttemptAt: null,
      error: null,
      errorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        inArray(tasks.status, ["draft", "queued"])
      )
    )
    .returning();

  if (cancelled) return cancelled;

  const [existing] = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!existing) throw notFound("Task not found");
  throw conflict(`A ${existing.status} task cannot be cancelled`);
}
