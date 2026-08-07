import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationError } from
  "@/shared/errors/application-error";
import { parseCreateTaskInput } from
  "./parse-create-task";

test("normalizes a valid task request", () => {
  assert.deepEqual(
    parseCreateTaskInput({
      userAgentId: " 123e4567-e89b-42d3-a456-426614174000 ",
      title: " Research ",
      prompt: " Find the closest competitors ",
    }),
    {
      userAgentId: "123e4567-e89b-42d3-a456-426614174000",
      title: "Research",
      prompt: "Find the closest competitors",
      priority: "normal",
    }
  );
});

test("rejects unsupported priority", () => {
  assert.throws(
    () =>
      parseCreateTaskInput({
        userAgentId: "123e4567-e89b-42d3-a456-426614174000",
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

test("rejects malformed employment IDs", () => {
  assert.throws(
    () => parseCreateTaskInput({
      userAgentId: "not-an-id",
      title: "Research",
      prompt: "Find relevant competitors",
    }),
    ApplicationError
  );
});

test("rejects inputs that are too short", () => {
  assert.throws(
    () => parseCreateTaskInput({
      userAgentId: "123e4567-e89b-42d3-a456-426614174000",
      title: "Hi",
      prompt: "Too short",
    }),
    ApplicationError
  );
});
