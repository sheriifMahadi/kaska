import assert from "node:assert/strict";
import test from "node:test";

import { deriveTaskWorkflowState } from "./task-workflow";

const derive = (
  executionStatus: Parameters<typeof deriveTaskWorkflowState>[0]["executionStatus"],
  paymentStatus: Parameters<typeof deriveTaskWorkflowState>[0]["paymentStatus"],
  attemptCount = 0
) => deriveTaskWorkflowState({ executionStatus, paymentStatus, attemptCount });

test("derives the successful paid-task workflow", () => {
  assert.equal(derive("draft", "approval_pending"), "DRAFT");
  assert.equal(derive("draft", "escrow_pending"), "ESCROW_PENDING");
  assert.equal(derive("draft", "locked"), "FUNDS_LOCKED");
  assert.equal(derive("queued", "locked"), "QUEUED");
  assert.equal(derive("running", "locked", 1), "RUNNING");
  assert.equal(derive("completed", "locked", 1), "EXECUTION_SUCCEEDED");
  assert.equal(derive("completed", "charge_pending", 1), "CHARGE_PENDING");
  assert.equal(derive("completed", "charged", 1), "CHARGED");
});

test("derives failure and refund states", () => {
  assert.equal(derive("failed", "failed"), "ESCROW_FAILED");
  assert.equal(derive("failed", "locked", 3), "EXECUTION_FAILED");
  assert.equal(derive("failed", "refund_pending", 3), "REFUND_PENDING");
  assert.equal(derive("failed", "refunded", 3), "REFUNDED");
  assert.equal(derive("cancelled", "locked"), "CANCELLED");
});

test("contradictory or flagged records require manual review", () => {
  assert.equal(derive("running", "charged", 1), "MANUAL_REVIEW");
  assert.equal(derive("completed", "manual_review", 1), "MANUAL_REVIEW");
  assert.equal(derive("manual_review", "locked", 1), "MANUAL_REVIEW");
});
