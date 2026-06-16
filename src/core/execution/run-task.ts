import { executeTask } from "./task-executor";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * ORCHESTRATION LAYER
 * - no queue logic
 * - no execution logic
 * - no business logic
 */
export async function runTask(taskId: string) {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .then((r) => r[0]);

  if (!task) {
    throw new Error("Task not found");
  }

  // optional guard (double safety layer)
  if (task.status === "completed") {
    console.log(`[RUN-SKIP] Task already completed ${taskId}`);
    return;
  }

  try {
    return await executeTask(taskId);
  } catch (err) {
    console.error("[RUN-TASK ERROR]", err);
    throw err;
  }
}