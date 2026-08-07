import {
  invalidInput,
} from "@/shared/errors/application-error";
import {
  isTaskPriority,
  TaskPriority,
} from "../domain/task-status";

export type CreateTaskInput = {
  userAgentId: string;
  title: string;
  prompt: string;
  priority: TaskPriority;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCreateTaskInput(
  body: unknown
): CreateTaskInput {
  if (!body || typeof body !== "object") {
    throw invalidInput("A JSON request body is required");
  }

  const value = body as Record<string, unknown>;
  const userAgentId =
    typeof value.userAgentId === "string"
      ? value.userAgentId.trim()
      : "";
  const title =
    typeof value.title === "string"
      ? value.title.trim()
      : "";
  const prompt =
    typeof value.prompt === "string"
      ? value.prompt.trim()
      : "";
  const priority = value.priority ?? "normal";

  if (!userAgentId || !title || !prompt) {
    throw invalidInput(
      "userAgentId, title and prompt are required"
    );
  }

  if (!UUID_PATTERN.test(userAgentId)) {
    throw invalidInput("userAgentId must be a valid UUID");
  }

  if (!isTaskPriority(priority)) {
    throw invalidInput(
      "priority must be low, normal, or high"
    );
  }

  if (title.length > 200) {
    throw invalidInput(
      "title must be 200 characters or fewer"
    );
  }

  if (title.length < 3) {
    throw invalidInput("title must be at least 3 characters");
  }

  if (prompt.length > 50_000) {
    throw invalidInput(
      "prompt must be 50,000 characters or fewer"
    );
  }

  if (prompt.length < 10) {
    throw invalidInput("prompt must be at least 10 characters");
  }

  return {
    userAgentId,
    title,
    prompt,
    priority,
  };
}
