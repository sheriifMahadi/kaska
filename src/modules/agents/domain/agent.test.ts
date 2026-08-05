import assert from "node:assert/strict";
import test from "node:test";

import { supportsNewWork } from "./agent";

test("only active employment accepts new work", () => {
  assert.equal(supportsNewWork("active"), true);
  assert.equal(supportsNewWork("paused"), false);
  assert.equal(supportsNewWork("archived"), false);
});
