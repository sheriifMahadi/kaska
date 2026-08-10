import { startPaymentWorker } from "../workers/payment-worker";
import { startTaskWorker } from "../workers/task-worker";
import { startWalletWorker } from "../workers/wallet-worker";

/** Runs every background responsibility in one process for local development. */
export async function startWorker(signal?: AbortSignal) {
  console.log("Kaska all-in-one worker started");
  await Promise.all([
    startTaskWorker(signal),
    startPaymentWorker(signal),
    startWalletWorker(signal),
  ]);
}
