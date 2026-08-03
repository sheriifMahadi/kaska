import assert from "node:assert/strict";
import test from "node:test";

import { parseWithdrawalRequest } from "./withdrawal";

const requestId = "01936f2e-7f70-7b62-8f1a-7fab5fda7465";

test("normalizes a valid withdrawal", () => {
  assert.deepEqual(
    parseWithdrawalRequest({
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "1.250000",
      idempotencyKey: requestId,
    }),
    {
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "1.25",
      microUsdc: 1_250_000n,
      idempotencyKey: requestId,
    }
  );
});

test("rejects invalid withdrawal fields", () => {
  assert.throws(() =>
    parseWithdrawalRequest({
      recipient: "not-an-address",
      amount: "1",
      idempotencyKey: requestId,
    })
  );
  assert.throws(() =>
    parseWithdrawalRequest({
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "0",
      idempotencyKey: requestId,
    })
  );
  assert.throws(() =>
    parseWithdrawalRequest({
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "1",
      idempotencyKey: "not-a-uuid",
    })
  );
});
