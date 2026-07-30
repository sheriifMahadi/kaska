import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tasks } from "@/db/schema";

import { runTask } from "./run-task";

export async function executeTask(taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task) {
    throw new Error("Task not found");
  }

  // Prevent duplicate execution
  if (task.status !== "queued") {
    return;
  }

  // Mark running
  await db
    .update(tasks)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  try {
    await runTask(taskId);

    await db
      .update(tasks)
      .set({
        status: "execution_succeeded",
        completedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  } catch (error) {
    await db
      .update(tasks)
      .set({
        status: "execution_failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      })
      .where(eq(tasks.id, taskId));

    throw error;
  }
}
