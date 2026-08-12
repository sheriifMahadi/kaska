import { processScheduleBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = workerRoute(
  "schedules",
  () => processScheduleBatch(5),
  (result) => [
    ...(result.claimed === 5 ? ["schedules" as const] : []),
    ...(result.materialized > 0 ? ["payments" as const] : []),
    ...(result.nextRunAt > 0
      ? [{
          role: "schedules" as const,
          notBefore: new Date(result.nextRunAt * 1_000),
        }]
      : []),
  ]
);
