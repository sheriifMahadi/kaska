import assert from "node:assert/strict";
import test from "node:test";

import { assertResourceOwner } from "./ownership";

test("allows the owner to use their resource", () => {
  assert.doesNotThrow(() =>
    assertResourceOwner("user-1", "user-1")
  );
});

test("rejects a different user's resource", () => {
  assert.throws(
    () => assertResourceOwner("user-1", "user-2"),
    (error: unknown) =>
      error instanceof Error &&
      "status" in error &&
      error.status === 403
  );
});
