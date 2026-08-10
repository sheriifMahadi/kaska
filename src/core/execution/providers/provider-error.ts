import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export class ProviderExecutionError extends Error {
  constructor(
    message: string,
    readonly provider: AgentExecutionProvider,
    readonly code: string,
    readonly retryable: boolean,
    readonly latencyMs: number,
    readonly requestedModel?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ProviderExecutionError";
  }
}

export function normalizeProviderError(
  error: unknown,
  provider: AgentExecutionProvider,
  latencyMs: number,
  requestedModel?: string
) {
  if (error instanceof ProviderExecutionError) return error;

  const status = getStatus(error);
  const retryable = status === 408 || status === 409 || status === 429 ||
    (status !== null && status >= 500);

  return new ProviderExecutionError(
    safeProviderMessage(error, status),
    provider,
    status ? `PROVIDER_HTTP_${status}` : "PROVIDER_REQUEST_FAILED",
    retryable,
    latencyMs,
    requestedModel,
    { cause: error }
  );
}

function getStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function safeProviderMessage(error: unknown, status: number | null) {
  if (status === 401 || status === 403) {
    return "The configured AI provider rejected Kaska's credentials.";
  }
  if (status === 402) {
    return "The AI provider spending limit or available credit has been reached.";
  }
  if (status === 429) {
    return "The AI provider is temporarily rate limited.";
  }
  if (status !== null && status >= 500) {
    return "The AI provider is temporarily unavailable.";
  }
  return error instanceof Error && error.message
    ? error.message
    : "The AI provider request failed.";
}
