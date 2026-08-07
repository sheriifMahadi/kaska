import assert from "node:assert/strict";
import test from "node:test";

import { ApplicationError } from "@/shared/errors/application-error";
import { parseTaskId } from "./task-id";

test("accepts valid task identifiers", () => {
  assert.equal(
    parseTaskId("123e4567-e89b-42d3-a456-426614174000"),
    "123e4567-e89b-42d3-a456-426614174000"
  );
});

test("rejects malformed task identifiers before querying Postgres", () => {
  assert.throws(() => parseTaskId("not-a-task"), ApplicationError);
});
