export const taskStatuses = [
  "draft",
  "escrow_pending",
  "funds_locked",
  "queued",
  "running",
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

export function isTaskPriority(
  value: unknown
): value is TaskPriority {
  return (
    typeof value === "string" &&
    taskPriorities.includes(value as TaskPriority)
  );
}

