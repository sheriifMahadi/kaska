import type { TaskPaymentStatus } from
  "@/modules/payments/domain/task-payment";
import type { TaskStatus } from "./task-status";

export const taskWorkflowStates = [
  "DRAFT",
  "ESCROW_PENDING",
  "ESCROW_FAILED",
  "FUNDS_LOCKED",
  "QUEUED",
  "RUNNING",
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "CANCELLED",
  "CHARGE_PENDING",
  "CHARGED",
  "REFUND_PENDING",
  "REFUNDED",
  "MANUAL_REVIEW",
] as const;

export type TaskWorkflowState = (typeof taskWorkflowStates)[number];

type WorkflowInput = {
  executionStatus: TaskStatus;
  paymentStatus: TaskPaymentStatus | null;
  attemptCount: number;
};

export function deriveTaskWorkflowState({
  executionStatus,
  paymentStatus,
  attemptCount,
}: WorkflowInput): TaskWorkflowState {
  if (
    executionStatus === "manual_review" ||
    paymentStatus === "manual_review"
  ) return "MANUAL_REVIEW";

  if (!paymentStatus) return legacyExecutionState(executionStatus);

  if (paymentStatus === "approval_pending") {
    return executionStatus === "draft" ? "DRAFT" : "MANUAL_REVIEW";
  }
  if (paymentStatus === "escrow_pending") {
    return executionStatus === "draft" || executionStatus === "cancelled"
      ? "ESCROW_PENDING"
      : "MANUAL_REVIEW";
  }
  if (paymentStatus === "failed") {
    return attemptCount === 0 ? "ESCROW_FAILED" : "EXECUTION_FAILED";
  }
  if (paymentStatus === "charge_pending") {
    return executionStatus === "completed"
      ? "CHARGE_PENDING"
      : "MANUAL_REVIEW";
  }
  if (paymentStatus === "charged") {
    return executionStatus === "completed" ? "CHARGED" : "MANUAL_REVIEW";
  }
  if (paymentStatus === "refund_pending") return "REFUND_PENDING";
  if (paymentStatus === "refunded") return "REFUNDED";

  if (executionStatus === "draft") return "FUNDS_LOCKED";
  if (executionStatus === "queued") return "QUEUED";
  if (executionStatus === "running") return "RUNNING";
  if (executionStatus === "completed") return "EXECUTION_SUCCEEDED";
  if (executionStatus === "failed") return "EXECUTION_FAILED";
  if (executionStatus === "cancelled") return "CANCELLED";
  return "MANUAL_REVIEW";
}

function legacyExecutionState(status: TaskStatus): TaskWorkflowState {
  if (status === "draft") return "DRAFT";
  if (status === "queued") return "QUEUED";
  if (status === "running") return "RUNNING";
  if (status === "completed") return "EXECUTION_SUCCEEDED";
  if (status === "failed") return "EXECUTION_FAILED";
  if (status === "cancelled") return "CANCELLED";
  return "MANUAL_REVIEW";
}
