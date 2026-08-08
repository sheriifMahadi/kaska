import assert from "node:assert/strict";
import test from "node:test";

import { canCancelTask, canTransitionTask } from "./task-status";

test("only pre-execution tasks can be cancelled", () => {
  assert.equal(canCancelTask("draft"), true);
  assert.equal(canCancelTask("queued"), true);
  assert.equal(canCancelTask("running"), false);
  assert.equal(canCancelTask("completed"), false);
  assert.equal(canCancelTask("failed"), false);
  assert.equal(canCancelTask("cancelled"), false);
});

test("task transitions reject repeated terminal execution", () => {
  assert.equal(canTransitionTask("draft", "queued"), true);
  assert.equal(canTransitionTask("queued", "running"), true);
  assert.equal(canTransitionTask("running", "completed"), true);
  assert.equal(canTransitionTask("completed", "running"), false);
  assert.equal(canTransitionTask("cancelled", "queued"), false);
});
