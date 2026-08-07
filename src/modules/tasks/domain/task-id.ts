import { invalidInput } from "@/shared/errors/application-error";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseTaskId(value: unknown) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw invalidInput("Task ID must be a valid UUID");
  }
  return value;
}
