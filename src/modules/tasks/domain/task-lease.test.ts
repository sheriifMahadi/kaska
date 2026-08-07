import assert from "node:assert/strict";
import test from "node:test";

import {
  isTaskLeaseExpired,
  taskLeaseExpiresAt,
} from "./task-lease";

test("task leases expire after their configured duration", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.equal(
    taskLeaseExpiresAt(now, 60_000).toISOString(),
    "2026-08-07T12:01:00.000Z"
  );
});

test("only elapsed leases are recoverable", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.equal(isTaskLeaseExpired(null, now), false);
  assert.equal(
    isTaskLeaseExpired(new Date("2026-08-07T12:00:01.000Z"), now),
    false
  );
  assert.equal(
    isTaskLeaseExpired(new Date("2026-08-07T12:00:00.000Z"), now),
    true
  );
});
