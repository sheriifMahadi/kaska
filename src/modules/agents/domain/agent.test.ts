import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionEmployment,
  employmentAction,
  supportsNewWork,
} from "./agent";

test("only active employment accepts new work", () => {
  assert.equal(supportsNewWork("active"), true);
  assert.equal(supportsNewWork("archived"), false);
});

test("employment transitions preserve archived as terminal", () => {
  assert.equal(canTransitionEmployment("active", "archived"), true);
  assert.equal(canTransitionEmployment("archived", "active"), false);
  assert.equal(canTransitionEmployment("active", "active"), false);
});

test("active agents can be employed once", () => {
  assert.equal(employmentAction(true, null), "create");
  assert.equal(employmentAction(true, "active"), "already_active");
});

test("archived agents can be employed again", () => {
  assert.equal(employmentAction(true, "archived"), "reactivate");
});

test("inactive agents cannot be employed or re-employed", () => {
  assert.equal(employmentAction(false, null), "unavailable");
  assert.equal(employmentAction(false, "archived"), "unavailable");
});
