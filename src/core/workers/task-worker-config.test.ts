import assert from "node:assert/strict";
import test from "node:test";

import {
  taskWorkerConcurrency,
  taskWorkerInstanceLabel,
} from "./task-worker-config";

test("task worker defaults to two execution slots", () => {
  assert.equal(taskWorkerConcurrency(undefined), 2);
});

test("task worker accepts bounded replica concurrency", () => {
  assert.equal(taskWorkerConcurrency("1"), 1);
  assert.equal(taskWorkerConcurrency("12"), 12);
  assert.throws(() => taskWorkerConcurrency("0"), /between 1 and 16/);
  assert.throws(() => taskWorkerConcurrency("17"), /between 1 and 16/);
  assert.throws(() => taskWorkerConcurrency("four"), /whole number/);
});

test("task worker instance labels are safe for logs and leases", () => {
  assert.equal(taskWorkerInstanceLabel(undefined), "local");
  assert.equal(taskWorkerInstanceLabel("task-a_2"), "task-a_2");
  assert.throws(() => taskWorkerInstanceLabel("task worker"), /1-40/);
});
