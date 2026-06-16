import {executeTask} from "./task-executor"


/**
 * Queue abstraction layer (production-ready pattern)
 * Today: in-memory
 * Tomorrow: Redis / BullMQ / SQS
 */

const queue: string[] = [];
let isProcessing = false;

export function enqueueTask(taskId: string) {
  queue.push(taskId);
  processQueue();
}

async function processQueue() {
  if (isProcessing) return;

  isProcessing = true;

  while (queue.length > 0) {
    const taskId = queue.shift();

    if (!taskId) continue;

    try {
      await executeTask(taskId);
    } catch (err) {
      console.error("[QUEUE EXECUTION ERROR]", err);
    }
  }

  isProcessing = false;
}