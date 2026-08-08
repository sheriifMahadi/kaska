import { randomUUID } from "node:crypto";

import {
  claimDueRecurringJob,
  deferRecurringJobLease,
} from "@/modules/schedules/application/schedule-claims";
import { materializeScheduledTask } from
  "@/modules/schedules/application/materialize-scheduled-task";

const POLL_INTERVAL_MS = 1_000;
const FAILURE_RETRY_MS = 30_000;
const BATCH_SIZE = 10;

export async function startScheduler(signal?: AbortSignal) {
  const schedulerId = `scheduler-${randomUUID()}`;
  console.log(`Kaska scheduler started (${schedulerId})`);

  try {
    while (!signal?.aborted) {
      for (let processed = 0; processed < BATCH_SIZE; processed += 1) {
        const job = await claimDueRecurringJob(schedulerId);
        if (!job) break;
        try {
          const result = await materializeScheduledTask(
            job.id,
            schedulerId
          );
          console.log(
            `Recurring job ${job.id}: ${result.outcome}`
          );
        } catch (error) {
          console.error(`Recurring job ${job.id} failed`, error);
          await deferRecurringJobLease(
            job.id,
            schedulerId,
            new Date(Date.now() + FAILURE_RETRY_MS)
          );
        }
      }
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
