import { randomUUID } from "node:crypto";

import { processTaskBatch } from "@/core/serverless/process-batches";
import { sleep } from "./sleep";
import {
  taskWorkerConcurrency,
  taskWorkerInstanceLabel,
} from "./task-worker-config";

const POLL_INTERVAL_MS = 1_000;

export async function startTaskWorker(signal?: AbortSignal) {
  const concurrency = taskWorkerConcurrency();
  const instance = taskWorkerInstanceLabel();
  const workerId = `tasks-${instance}-${randomUUID()}`;
  console.log(
    `Kaska task worker started (${workerId}, slots=${concurrency})`
  );

  try {
    while (!signal?.aborted) {
      try {
        await processTaskBatch(concurrency, workerId);
      } catch (error) {
        console.error("Task worker error:", error);
      }

      await sleep(POLL_INTERVAL_MS, signal);
    }
  } finally {
    console.log(`Kaska task worker stopped (${workerId})`);
  }
}
