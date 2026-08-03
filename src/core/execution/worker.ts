import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { processWalletProvisioningQueue } from
  "@/modules/identity/application/process-wallet-provisioning";
import { syncPendingWithdrawals } from
  "@/modules/wallets/application/sync-pending-withdrawals";
import { reconcileCircleTransactions } from
  "@/modules/wallets/application/reconcile-circle-transactions";

import { executeTask } from "./task-executor";

const POLL_INTERVAL = 1000;

let started = false;

// Prevent scheduling the same task twice
const activeTasks = new Set<string>();

export async function startWorker(
  signal?: AbortSignal
) {
  if (started) {
    return;
  }

  started = true;

  console.log("🚀 Kaska worker started");

  while (!signal?.aborted) {
    try {
      await processWalletProvisioningQueue();
      await syncPendingWithdrawals();
      await reconcileCircleTransactions();
      await processQueue();
    } catch (error) {
      console.error("Worker error:", error);
    }

    await sleep(POLL_INTERVAL, signal);
  }

  started = false;
  console.log("Kaska worker stopped");
}

async function processQueue() {
  const queuedTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "queued"))
    .orderBy(asc(tasks.createdAt));

  if (queuedTasks.length === 0) {
    return;
  }

  const grouped = new Map<string, typeof queuedTasks>();

  for (const task of queuedTasks) {
    if (!grouped.has(task.userAgentId)) {
      grouped.set(task.userAgentId, []);
    }

    grouped.get(task.userAgentId)!.push(task);
  }

  for (const [userAgentId, queue] of grouped.entries()) {
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
      continue;
    }

    const nextTask = queue[0];

    if (!nextTask) {
      continue;
    }

    // Already being started
    if (activeTasks.has(nextTask.id)) {
      continue;
    }

    activeTasks.add(nextTask.id);

    void executeTask(nextTask.id)
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        activeTasks.delete(nextTask.id);
      });
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
