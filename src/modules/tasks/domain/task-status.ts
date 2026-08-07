export const taskStatuses = [
  // Phase 4 execution lifecycle
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  // Legacy/payment lifecycle values retained for existing records.
  "draft",
  "escrow_pending",
  "funds_locked",
  "execution_succeeded",
  "charge_pending",
  "charged",
  "escrow_failed",
  "execution_failed",
  "refund_pending",
  "refunded",
  "manual_review",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = [
  "low",
  "normal",
  "high",
] as const;

export type TaskPriority =
  (typeof taskPriorities)[number];

export const executableTaskStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export function isTaskPriority(
  value: unknown
): value is TaskPriority {
  return (
    typeof value === "string" &&
    taskPriorities.includes(value as TaskPriority)
  );
}

export function canCancelTask(status: TaskStatus) {
  return status === "queued";
}
