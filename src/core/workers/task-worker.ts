import { randomUUID } from "node:crypto";

import { executeTask } from "@/core/execution/task-executor";
import {
  claimNextTask,
  failExhaustedTaskLeases,
} from "@/modules/tasks/application/task-claims";
import { sleep } from "./sleep";

const POLL_INTERVAL_MS = 1_000;
const MAX_CONCURRENT_TASKS = 4;

export async function startTaskWorker(signal?: AbortSignal) {
  const workerId = `tasks-${randomUUID()}`;
  const activeTasks = new Set<Promise<void>>();
  console.log(`Kaska task worker started (${workerId})`);

  try {
    while (!signal?.aborted) {
      try {
        await failExhaustedTaskLeases();
        while (activeTasks.size < MAX_CONCURRENT_TASKS) {
          const task = await claimNextTask(workerId);
          if (!task) break;

          const execution = executeTask({
            taskId: task.task.id,
            attemptId: task.attemptId,
            attemptNumber: task.task.attemptCount,
            maxAttempts: task.task.maxAttempts,
            workerId,
          })
            .catch((error) => console.error(`Task ${task.task.id} failed`, error))
            .finally(() => activeTasks.delete(execution));

          activeTasks.add(execution);
        }
      } catch (error) {
        console.error("Task worker error:", error);
      }

      await sleep(POLL_INTERVAL_MS, signal);
    }
    await Promise.allSettled(activeTasks);
  } finally {
    console.log(`Kaska task worker stopped (${workerId})`);
  }
}
