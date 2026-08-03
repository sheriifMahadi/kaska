import assert from "node:assert/strict";
import test from "node:test";

import {
  statusFromCircleState,
  transactionDirection,
} from "./wallet-transaction";

test("deposits credit and withdrawals debit the wallet", () => {
  assert.equal(transactionDirection("deposit"), "credit");
  assert.equal(transactionDirection("withdrawal"), "debit");
});

test("maps Circle transaction states", () => {
  assert.equal(statusFromCircleState("INITIATED"), "pending");
  assert.equal(statusFromCircleState("SENT"), "pending");
  assert.equal(statusFromCircleState("CONFIRMED"), "confirmed");
  assert.equal(statusFromCircleState("COMPLETE"), "confirmed");
  assert.equal(statusFromCircleState("FAILED"), "failed");
  assert.equal(statusFromCircleState("DENIED"), "failed");
  assert.equal(statusFromCircleState("CANCELLED"), "failed");
  assert.equal(statusFromCircleState("STUCK"), "failed");
});
