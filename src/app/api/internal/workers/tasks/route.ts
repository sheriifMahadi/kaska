import { processTaskBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = workerRoute(
  "tasks",
  () => processTaskBatch(2),
  (result) => [
    ...(result.claimed === 2 ? ["tasks" as const] : []),
    ...(result.failed > 0
      ? [{ role: "tasks" as const, delaySeconds: 30 }]
      : []),
    ...(result.claimed > 0 ? ["payments" as const] : []),
  ]
);
