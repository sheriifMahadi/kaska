import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationError } from
  "@/shared/errors/application-error";
import { parseCreateTaskInput } from
  "./parse-create-task";

test("normalizes a valid task request", () => {
  assert.deepEqual(
    parseCreateTaskInput({
      userAgentId: " worker-id ",
      title: " Research ",
      prompt: " Find competitors ",
    }),
    {
      userAgentId: "worker-id",
      title: "Research",
      prompt: "Find competitors",
      priority: "normal",
    }
  );
});

test("rejects unsupported priority", () => {
  assert.throws(
    () =>
      parseCreateTaskInput({
        userAgentId: "worker-id",
        title: "Research",
        prompt: "Find competitors",
        priority: "urgent",
      }),
    ApplicationError
  );
});

test("rejects missing task fields", () => {
  assert.throws(
    () => parseCreateTaskInput({ title: "Research" }),
    ApplicationError
  );
});

