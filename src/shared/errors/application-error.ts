export class ApplicationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function unauthorized(message = "Unauthorized") {
  return new ApplicationError(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return new ApplicationError(message, 403, "FORBIDDEN");
}

export function notFound(message: string) {
  return new ApplicationError(message, 404, "NOT_FOUND");
}

export function conflict(message: string) {
  return new ApplicationError(message, 409, "CONFLICT");
}

export function invalidInput(message: string) {
  return new ApplicationError(message, 400, "INVALID_INPUT");
}

