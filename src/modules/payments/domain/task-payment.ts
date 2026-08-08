export const taskPaymentStatuses = [
  "approval_pending",
  "escrow_pending",
  "locked",
  "charge_pending",
  "charged",
  "refund_pending",
  "refunded",
  "failed",
  "manual_review",
] as const;

export type TaskPaymentStatus = (typeof taskPaymentStatuses)[number];
export type TaskSettlementKind = "charge" | "refund";
export type TaskPaymentAttemptKind =
  | "approval"
  | "escrow"
  | "charge"
  | "refund";
export type TaskPaymentAttemptStatus =
  | "prepared"
  | "submitted"
  | "pending"
  | "confirmed"
  | "failed"
  | "reconciled";

const attemptTransitions: Record<
  TaskPaymentAttemptStatus,
  readonly TaskPaymentAttemptStatus[]
> = {
  prepared: ["submitted", "reconciled", "failed"],
  submitted: ["pending", "confirmed", "reconciled", "failed"],
  pending: ["confirmed", "reconciled", "failed"],
  confirmed: [],
  failed: [],
  reconciled: [],
};

export function canTransitionPaymentAttempt(
  from: TaskPaymentAttemptStatus,
  to: TaskPaymentAttemptStatus
) {
  return attemptTransitions[from].includes(to);
}

const paymentTransitions: Record<
  TaskPaymentStatus,
  readonly TaskPaymentStatus[]
> = {
  approval_pending: ["escrow_pending", "refunded", "failed", "manual_review"],
  escrow_pending: ["locked", "failed", "manual_review"],
  locked: ["charge_pending", "refund_pending", "manual_review"],
  charge_pending: ["charged", "refunded", "manual_review"],
  refund_pending: ["refunded", "manual_review"],
  charged: ["manual_review"],
  refunded: ["manual_review"],
  failed: ["manual_review"],
  manual_review: [],
};

export function canTransitionPayment(
  from: TaskPaymentStatus,
  to: TaskPaymentStatus
) {
  return paymentTransitions[from].includes(to);
}

export function paymentNeedsPolling(status: TaskPaymentStatus) {
  return status.endsWith("_pending") || status === "locked";
}

export const PAYMENT_LEASE_MS = 2 * 60 * 1_000;

export function paymentLeaseExpiresAt(now = new Date()) {
  return new Date(now.getTime() + PAYMENT_LEASE_MS);
}

export function paymentLeaseIsAvailable(
  leaseExpiresAt: Date | null,
  now = new Date()
) {
  return leaseExpiresAt === null || leaseExpiresAt <= now;
}

export function settlementForExecutionStatus(status: string) {
  if (status === "completed") return "charge" as const;
  if (status === "failed" || status === "cancelled") {
    return "refund" as const;
  }
  return null;
}

export type PaymentReconciliationAction =
  | "none"
  | "lock"
  | "charge"
  | "refund"
  | "manual_review";

export function paymentReconciliationAction(
  paymentStatus: TaskPaymentStatus,
  executionStatus: string,
  onChainStatus: number,
  settlementKind: TaskSettlementKind | null = null
): PaymentReconciliationAction {
  if (onChainStatus === 0) {
    return paymentStatus === "approval_pending" ||
      paymentStatus === "escrow_pending" ||
      paymentStatus === "failed" ||
      (paymentStatus === "refunded" && settlementKind === null)
      ? "none"
      : "manual_review";
  }
  if (onChainStatus === 1) {
    if (
      paymentStatus === "approval_pending" ||
      paymentStatus === "escrow_pending"
    ) return "lock";
    if (
      paymentStatus === "locked" ||
      paymentStatus === "charge_pending" ||
      paymentStatus === "refund_pending" ||
      paymentStatus === "manual_review"
    ) return "none";
    return "manual_review";
  }
  if (onChainStatus === 2) {
    if (paymentStatus === "refunded") return "none";
    return paymentStatus === "charged" ? "manual_review" : "refund";
  }
  if (onChainStatus === 3) {
    if (paymentStatus === "charged") return "none";
    return executionStatus === "completed" && paymentStatus !== "refunded"
      ? "charge"
      : "manual_review";
  }
  return "manual_review";
}
