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

export function paymentNeedsPolling(status: TaskPaymentStatus) {
  return status.endsWith("_pending") || status === "locked";
}

export function settlementForExecutionStatus(status: string) {
  if (status === "completed") return "charge" as const;
  if (status === "failed" || status === "cancelled") {
    return "refund" as const;
  }
  return null;
}
