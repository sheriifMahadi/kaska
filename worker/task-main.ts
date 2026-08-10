import { runWorkerService } from "./worker-service";

void runWorkerService("task", () => import("../src/core/workers/task-worker")
  .then(({ startTaskWorker }) => startTaskWorker));
