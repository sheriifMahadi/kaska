import assert from "node:assert/strict";
import test from "node:test";

import { canCancelTask } from "./task-status";

test("only queued tasks can be cancelled", () => {
  assert.equal(canCancelTask("queued"), true);
  assert.equal(canCancelTask("running"), false);
  assert.equal(canCancelTask("completed"), false);
  assert.equal(canCancelTask("failed"), false);
  assert.equal(canCancelTask("cancelled"), false);
});
