import { runWorkerService } from "./worker-service";

void runWorkerService("payment", () => import("../src/core/workers/payment-worker")
  .then(({ startPaymentWorker }) => startPaymentWorker));
