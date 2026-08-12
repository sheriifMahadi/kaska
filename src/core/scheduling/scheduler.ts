import { randomUUID } from "node:crypto";

import { processScheduleBatch } from "@/core/serverless/process-batches";

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 10;

export async function startScheduler(signal?: AbortSignal) {
  const schedulerId = `scheduler-${randomUUID()}`;
  console.log(`Kaska scheduler started (${schedulerId})`);

  try {
    while (!signal?.aborted) {
      await processScheduleBatch(BATCH_SIZE, schedulerId);
      await sleep(POLL_INTERVAL_MS, signal);
    }
  } finally {
    console.log("Kaska scheduler stopped");
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      finish();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
