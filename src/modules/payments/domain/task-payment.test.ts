import assert from "node:assert/strict";
import test from "node:test";

import {
  paymentNeedsPolling,
  settlementForExecutionStatus,
  canTransitionPayment,
  canTransitionPaymentAttempt,
  PAYMENT_LEASE_MS,
  paymentLeaseExpiresAt,
  paymentLeaseIsAvailable,
  paymentReconciliationAction,
} from "./task-payment";

test("only unfinished payments need worker polling", () => {
  assert.equal(paymentNeedsPolling("approval_pending"), true);
  assert.equal(paymentNeedsPolling("escrow_pending"), true);
  assert.equal(paymentNeedsPolling("locked"), true);
  assert.equal(paymentNeedsPolling("charge_pending"), true);
  assert.equal(paymentNeedsPolling("refund_pending"), true);
  assert.equal(paymentNeedsPolling("charged"), false);
  assert.equal(paymentNeedsPolling("refunded"), false);
  assert.equal(paymentNeedsPolling("failed"), false);
});

test("chain state selects only safe payment repairs", () => {
  assert.equal(
    paymentReconciliationAction("escrow_pending", "draft", 1),
    "lock"
  );
  assert.equal(
    paymentReconciliationAction("charge_pending", "completed", 3),
    "charge"
  );
  assert.equal(
    paymentReconciliationAction("refund_pending", "failed", 2),
    "refund"
  );
  assert.equal(
    paymentReconciliationAction("refunded", "failed", 3),
    "manual_review"
  );
  assert.equal(
    paymentReconciliationAction("charged", "completed", 0),
    "manual_review"
  );
  assert.equal(
    paymentReconciliationAction("refunded", "cancelled", 0, null),
    "none"
  );
  assert.equal(
    paymentReconciliationAction("charged", "completed", 3, "charge"),
    "none"
  );
});

test("payment leases recover after a worker disappears", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");
  assert.equal(
    paymentLeaseExpiresAt(now).getTime(),
    now.getTime() + PAYMENT_LEASE_MS
  );
  assert.equal(paymentLeaseIsAvailable(null, now), true);
  assert.equal(
    paymentLeaseIsAvailable(new Date("2026-08-08T11:59:59.000Z"), now),
    true
  );
  assert.equal(
    paymentLeaseIsAvailable(new Date("2026-08-08T12:00:01.000Z"), now),
    false
  );
});

test("payment attempt history has terminal outcomes", () => {
  assert.equal(canTransitionPaymentAttempt("prepared", "submitted"), true);
  assert.equal(canTransitionPaymentAttempt("submitted", "pending"), true);
  assert.equal(canTransitionPaymentAttempt("pending", "confirmed"), true);
  assert.equal(canTransitionPaymentAttempt("confirmed", "submitted"), false);
  assert.equal(canTransitionPaymentAttempt("failed", "pending"), false);
  assert.equal(canTransitionPaymentAttempt("reconciled", "submitted"), false);
});

test("payment transitions cannot repeat settlement", () => {
  assert.equal(canTransitionPayment("approval_pending", "escrow_pending"), true);
  assert.equal(canTransitionPayment("escrow_pending", "locked"), true);
  assert.equal(canTransitionPayment("locked", "charge_pending"), true);
  assert.equal(canTransitionPayment("charge_pending", "charged"), true);
  assert.equal(canTransitionPayment("charged", "charge_pending"), false);
  assert.equal(canTransitionPayment("refunded", "refund_pending"), false);
});

test("execution outcome selects a fixed settlement destination", () => {
  assert.equal(settlementForExecutionStatus("completed"), "charge");
  assert.equal(settlementForExecutionStatus("failed"), "refund");
  assert.equal(settlementForExecutionStatus("cancelled"), "refund");
  assert.equal(settlementForExecutionStatus("running"), null);
});
