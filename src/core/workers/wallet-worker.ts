import { randomUUID } from "node:crypto";

import { processWalletProvisioningQueue } from
  "@/modules/identity/application/process-wallet-provisioning";
import { reconcileCircleTransactions } from
  "@/modules/wallets/application/reconcile-circle-transactions";
import { syncPendingWithdrawals } from
  "@/modules/wallets/application/sync-pending-withdrawals";
import { sleep } from "./sleep";

const POLL_INTERVAL_MS = 5_000;

export async function startWalletWorker(signal?: AbortSignal) {
  const workerId = `wallets-${randomUUID()}`;
  console.log(`Kaska wallet worker started (${workerId})`);

  try {
    while (!signal?.aborted) {
      try {
        await processWalletProvisioningQueue();
        await syncPendingWithdrawals();
        await reconcileCircleTransactions();
      } catch (error) {
        console.error("Wallet worker error:", error);
      }
      await sleep(POLL_INTERVAL_MS, signal);
    }
  } finally {
    console.log(`Kaska wallet worker stopped (${workerId})`);
  }
}
