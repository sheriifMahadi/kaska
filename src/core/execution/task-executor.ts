import { and, eq } from "drizzle-orm";

import { tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { renewTaskLease } from
  "@/modules/tasks/application/task-claims";
import { TASK_HEARTBEAT_INTERVAL_MS } from
  "@/modules/tasks/domain/task-lease";
import { runTask } from "./run-task";

export async function executeTask(
  taskId: string,
  workerId: string
) {
  const heartbeat = setInterval(() => {
    void renewTaskLease(taskId, workerId).catch((error) => {
      console.error(`Could not renew lease for task ${taskId}`, error);
    });
  }, TASK_HEARTBEAT_INTERVAL_MS);

  heartbeat.unref();

  try {
    await runTask(taskId);

    await db
      .update(tasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "running"),
          eq(tasks.leaseOwner, workerId)
        )
      );
  } catch (error) {
    const now = new Date();
    await db
      .update(tasks)
      .set({
        status: "failed",
        failedAt: now,
        errorCode: "EXECUTION_FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "running"),
          eq(tasks.leaseOwner, workerId)
        )
      );

    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}
