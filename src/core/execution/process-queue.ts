import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tasks } from "@/db/schema";

import { executeTask } from "./task-executor";

export async function processQueue() {
  // Find all queued tasks
  const queuedTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "queued"))
    .orderBy(asc(tasks.createdAt));

  // Group queued tasks by hired agent
  const queues = new Map<string, typeof queuedTasks>();

  for (const task of queuedTasks) {
    const queue = queues.get(task.userAgentId);

    if (queue) {
      queue.push(task);
    } else {
      queues.set(task.userAgentId, [task]);
    }
  }

  // Each hired agent can execute ONE task at a time
  await Promise.all(
    [...queues.entries()].map(async ([userAgentId, queue]) => {
      // Is this worker already running something?
      const running = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userAgentId, userAgentId),
            eq(tasks.status, "running")
          )
        );

      if (running.length > 0) {
        return;
      }

      // Execute the oldest queued task
      const nextTask = queue[0];

      if (!nextTask) {
        return;
      }

      await executeTask(nextTask.id);
    })
  );
}