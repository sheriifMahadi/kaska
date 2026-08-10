import type { ExecutionRequest } from "./ai-provider";

export function buildOpenRouterRequest(request: ExecutionRequest) {
  return {
    model: request.model,
    messages: [
      { role: "system" as const, content: request.systemPrompt },
      { role: "user" as const, content: request.userPrompt },
    ],
    max_tokens: request.maxOutputTokens,
    ...(request.allowWebSearch
      ? {
          // The server tool remains model-decided even when some routed
          // providers receive tool_choice=required. The compatibility plugin
          // performs one search before inference, which is deterministic for
          // agents whose contract requires current web data.
          plugins: [{
            id: "web" as const,
            engine: "parallel" as const,
            max_results: 5,
          }],
        }
      : {}),
  };
}
