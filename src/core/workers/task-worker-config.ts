const DEFAULT_CONCURRENCY = 2;
const MAX_CONCURRENCY_PER_REPLICA = 16;

export function taskWorkerConcurrency(value = process.env.TASK_WORKER_CONCURRENCY) {
  if (!value?.trim()) return DEFAULT_CONCURRENCY;
  if (!/^\d+$/.test(value.trim())) {
    throw new Error("TASK_WORKER_CONCURRENCY must be a whole number");
  }
  const concurrency = Number(value);
  if (concurrency < 1 || concurrency > MAX_CONCURRENCY_PER_REPLICA) {
    throw new Error(
      `TASK_WORKER_CONCURRENCY must be between 1 and ${MAX_CONCURRENCY_PER_REPLICA}`
    );
  }
  return concurrency;
}

export function taskWorkerInstanceLabel(
  value = process.env.WORKER_INSTANCE_ID
) {
  const label = value?.trim() || "local";
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(label)) {
    throw new Error(
      "WORKER_INSTANCE_ID must contain 1-40 letters, numbers, underscores, or hyphens"
    );
  }
  return label;
}
