import { startWorker } from "@/core/execution/worker";

declare global {
  var __kaskaWorkerStarted: boolean | undefined;
}

if (
  process.env.NODE_ENV !== "test" &&
  !global.__kaskaWorkerStarted
) {
  global.__kaskaWorkerStarted = true;

  startWorker().catch((error) => {
    console.error("Failed to start worker:", error);
  });
}