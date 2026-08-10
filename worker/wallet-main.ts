import { runWorkerService } from "./worker-service";

void runWorkerService("wallet", () => import("../src/core/workers/wallet-worker")
  .then(({ startWalletWorker }) => startWalletWorker));
