import { randomUUID } from "node:crypto";

import { processWalletBatch } from "@/core/serverless/process-batches";
import { sleep } from "./sleep";

const POLL_INTERVAL_MS = 5_000;

export async function startWalletWorker(signal?: AbortSignal) {
  const workerId = `wallets-${randomUUID()}`;
  console.log(`Kaska wallet worker started (${workerId})`);

  try {
    while (!signal?.aborted) {
      try {
        await processWalletBatch(5, workerId);
      } catch (error) {
        console.error("Wallet worker error:", error);
      }
      await sleep(POLL_INTERVAL_MS, signal);
    }
  } finally {
    console.log(`Kaska wallet worker stopped (${workerId})`);
  }
}
