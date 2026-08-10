import type { ExecutionRequest } from "./ai-provider";

export function buildOpenRouterRequest(request: ExecutionRequest) {
  return {
    model: request.model,
    messages: [
      { role: "system" as const, content: request.systemPrompt },
      { role: "user" as const, content: request.userPrompt },
    ],
    max_tokens: request.maxOutputTokens,
  };
}
