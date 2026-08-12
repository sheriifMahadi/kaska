import { startScheduler } from "../scheduling/scheduler";
import { startPaymentWorker } from "../workers/payment-worker";
import { startTaskWorker } from "../workers/task-worker";
import { startWalletWorker } from "../workers/wallet-worker";

/** Runs every background responsibility in one deployable process. */
export async function startWorker(signal?: AbortSignal) {
  console.log("Kaska background service started");
  await Promise.all([
    startTaskWorker(signal),
    startPaymentWorker(signal),
    startWalletWorker(signal),
    startScheduler(signal),
  ]);
}
