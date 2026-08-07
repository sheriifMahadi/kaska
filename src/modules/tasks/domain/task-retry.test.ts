import assert from "node:assert/strict";
import test from "node:test";

import { decideTaskRetry, nextTaskAttemptAt } from "./task-retry";

test("retryable failures use increasing delays", () => {
  assert.deepEqual(decideTaskRetry(true, 1, 3), {
    retry: true,
    delayMs: 5_000,
  });
  assert.deepEqual(decideTaskRetry(true, 2, 3), {
    retry: true,
    delayMs: 30_000,
  });
});

test("non-retryable and exhausted failures stop", () => {
  assert.deepEqual(decideTaskRetry(false, 1, 3), {
    retry: false,
    delayMs: null,
  });
  assert.deepEqual(decideTaskRetry(true, 3, 3), {
    retry: false,
    delayMs: null,
  });
});

test("next attempt time is deterministic", () => {
  assert.equal(
    nextTaskAttemptAt(new Date("2026-08-07T10:00:00Z"), 5_000).toISOString(),
    "2026-08-07T10:00:05.000Z"
  );
});
