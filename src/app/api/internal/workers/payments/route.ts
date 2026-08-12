import { processPaymentBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = workerRoute(
  "payments",
  () => processPaymentBatch(5, 2),
  (result) => result.processed > 0 ? ["tasks", "payments"] : []
);
