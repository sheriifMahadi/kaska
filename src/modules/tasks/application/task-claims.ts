import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";

import { taskAttempts, tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { taskLeaseExpiresAt } from "../domain/task-lease";

export async function claimNextTask(workerId: string) {
  const now = new Date();

  return db.transaction(async (transaction) => {
    const [candidate] = await transaction
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          lt(tasks.attemptCount, tasks.maxAttempts),
          or(
            and(
              eq(tasks.status, "queued"),
              or(
                isNull(tasks.nextAttemptAt),
                lte(tasks.nextAttemptAt, now)
              )
            ),
            and(
              eq(tasks.status, "running"),
              lt(tasks.leaseExpiresAt, now)
            )
          )
        )
      )
      .orderBy(asc(tasks.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;

    await transaction
      .update(taskAttempts)
      .set({
        status: "abandoned",
        endedAt: now,
        errorCode: "LEASE_EXPIRED",
        errorMessage: "The worker lease expired before completion.",
        retryable: true,
      })
      .where(
        and(
          eq(taskAttempts.taskId, candidate.id),
          eq(taskAttempts.status, "running")
        )
      );

    const [claimed] = await transaction
      .update(tasks)
      .set({
        status: "running",
        attemptCount: sql`${tasks.attemptCount} + 1`,
        startedAt: now,
        leaseOwner: workerId,
        leaseExpiresAt: taskLeaseExpiresAt(now),
        lastHeartbeatAt: now,
        error: null,
        errorCode: null,
        failedAt: null,
        nextAttemptAt: null,
        updatedAt: now,
      })
      .where(eq(tasks.id, candidate.id))
      .returning();

    if (!claimed) return null;

    const [attempt] = await transaction
      .insert(taskAttempts)
      .values({
        taskId: claimed.id,
        attemptNumber: claimed.attemptCount,
        workerId,
      })
      .returning({ id: taskAttempts.id });

    return attempt ? { task: claimed, attemptId: attempt.id } : null;
  });
}

export async function renewTaskLease(
  taskId: string,
  workerId: string
) {
  const now = new Date();
  const [renewed] = await db
    .update(tasks)
    .set({
      leaseExpiresAt: taskLeaseExpiresAt(now),
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.status, "running"),
        eq(tasks.leaseOwner, workerId)
      )
    )
    .returning({ id: tasks.id });

  return Boolean(renewed);
}

export function failExhaustedTaskLeases() {
  const now = new Date();
  return db.transaction(async (transaction) => {
    const exhausted = await transaction
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "running"),
          lt(tasks.leaseExpiresAt, now),
          sql`${tasks.attemptCount} >= ${tasks.maxAttempts}`
        )
      )
      .for("update", { skipLocked: true });

    if (!exhausted.length) return;
    const ids = exhausted.map(({ id }) => id);

    await transaction
      .update(taskAttempts)
      .set({
        status: "abandoned",
        endedAt: now,
        errorCode: "LEASE_EXPIRED",
        errorMessage: "The worker lease expired before completion.",
        retryable: false,
      })
      .where(
        and(
          inArray(taskAttempts.taskId, ids),
          eq(taskAttempts.status, "running")
        )
      );

    await transaction
      .update(tasks)
      .set({
        status: "failed",
        failedAt: now,
        errorCode: "LEASE_EXPIRED",
        error: "Task execution stopped before completion and exhausted its attempts.",
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(inArray(tasks.id, ids));
  });
}
