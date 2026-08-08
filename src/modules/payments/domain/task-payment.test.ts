import assert from "node:assert/strict";
import test from "node:test";

import {
  paymentNeedsPolling,
  settlementForExecutionStatus,
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

test("execution outcome selects a fixed settlement destination", () => {
  assert.equal(settlementForExecutionStatus("completed"), "charge");
  assert.equal(settlementForExecutionStatus("failed"), "refund");
  assert.equal(settlementForExecutionStatus("cancelled"), "refund");
  assert.equal(settlementForExecutionStatus("running"), null);
});
