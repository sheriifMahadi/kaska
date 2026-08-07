import { and, asc, eq, lt, or, sql } from "drizzle-orm";

import { tasks } from "@/db/schema";
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
            eq(tasks.status, "queued"),
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
        updatedAt: now,
      })
      .where(eq(tasks.id, candidate.id))
      .returning();

    return claimed ?? null;
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
  return db
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
    .where(
      and(
        eq(tasks.status, "running"),
        lt(tasks.leaseExpiresAt, now),
        sql`${tasks.attemptCount} >= ${tasks.maxAttempts}`
      )
    );
}
