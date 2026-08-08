export const taskStatuses = [
  "draft",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
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

const taskTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ["queued", "cancelled", "failed", "manual_review"],
  queued: ["running", "cancelled", "failed", "manual_review"],
  running: ["queued", "completed", "failed", "manual_review"],
  completed: ["manual_review"],
  failed: ["queued", "manual_review"],
  cancelled: ["manual_review"],
  manual_review: [],
};

export function canTransitionTask(
  from: TaskStatus,
  to: TaskStatus
) {
  return taskTransitions[from].includes(to);
}

export function isTaskPriority(
  value: unknown
): value is TaskPriority {
  return (
    typeof value === "string" &&
    taskPriorities.includes(value as TaskPriority)
  );
}

export function canCancelTask(status: TaskStatus) {
  return status === "draft" || status === "queued";
}
