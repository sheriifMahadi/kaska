import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { conflict, notFound } from "@/shared/errors/application-error";

export async function retryTask(userId: string, taskId: string) {
  const now = new Date();
  const [retried] = await db
    .update(tasks)
    .set({
      status: "queued",
      maxAttempts: sql`${tasks.attemptCount} + 3`,
      queuedAt: now,
      nextAttemptAt: null,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      cancelledAt: null,
      error: null,
      errorCode: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        eq(tasks.status, "failed")
      )
    )
    .returning();

  if (retried) return retried;

  const [existing] = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!existing) throw notFound("Task not found");
  throw conflict(`A ${existing.status} task cannot be retried`);
}
