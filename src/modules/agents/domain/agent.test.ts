import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionEmployment,
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
